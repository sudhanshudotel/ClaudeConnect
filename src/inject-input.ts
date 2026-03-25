import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Injects text into the VSCode Claude Code input by:
 * 1. Copying the text to the clipboard
 * 2. Focusing the VSCode window
 * 3. Simulating Ctrl+V (paste) and Enter (submit)
 */
export function injectTextToVSCode(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // PowerShell single-quoted strings don't expand variables ($, `, etc.)
    // Only single quotes need escaping (doubled) within single-quoted strings
    const sanitized = text.replace(/[\r\n]/g, " ");
    const escaped = sanitized.replace(/'/g, "''");
    const scriptPath = join(tmpdir(), "claude-connect-inject.ps1");

    const script = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

Set-Clipboard '${escaped}'

$proc = Get-Process -Name "Code" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Visual Studio Code*' } | Select-Object -First 1
if ($proc) {
    [Win32]::SetForegroundWindow($proc.MainWindowHandle)
    Start-Sleep -Milliseconds 500
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Write-Output "OK"
} else {
    Write-Output "NO_VSCODE"
}
`;

    try {
      writeFileSync(scriptPath, script, "utf-8");
    } catch (e) {
      console.error("[Inject] Failed to write script:", e);
      resolve(false);
      return;
    }

    exec(
      `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 15000 },
      (err, stdout, stderr) => {
        // Clean up temp file
        try { unlinkSync(scriptPath); } catch {}

        if (err) {
          console.error("[Inject] PowerShell error:", err.message);
          if (stderr) console.error("[Inject] stderr:", stderr);
          resolve(false);
          return;
        }
        const output = stdout.trim();
        console.log(`[Inject] PowerShell output: ${output}`);
        if (output.includes("OK")) {
          console.log("[Inject] Text injected into VSCode successfully");
          resolve(true);
        } else {
          console.error("[Inject] VSCode window not found");
          resolve(false);
        }
      }
    );
  });
}
