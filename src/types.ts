// Hook payload base — common fields sent by every Claude Code hook
export interface HookPayloadBase {
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  permission_mode?: string;
  hook_event_name: string;
  agent_id?: string;
  agent_type?: string;
}

// PermissionRequest hook payload
export interface PermissionRequestPayload extends HookPayloadBase {
  hook_event_name: "PermissionRequest";
  tool_name: string;
  tool_input: Record<string, unknown>;
}

// Notification hook payload
export interface NotificationPayload extends HookPayloadBase {
  hook_event_name: "Notification";
  message?: string;
  notification_type?: string;
}

// Stop hook payload
export interface StopPayload extends HookPayloadBase {
  hook_event_name: "Stop";
  stop_hook_active?: boolean;
  last_assistant_message?: string;
}

// Response for PermissionRequest hooks
export interface PermissionDecision {
  behavior: "allow" | "deny";
  message?: string;
}

export interface PermissionRequestResponse {
  hookSpecificOutput: {
    hookEventName: "PermissionRequest";
    decision: PermissionDecision;
  };
}

// Pending request stored in the map
export interface PendingRequest {
  id: string;
  hookEventName: string;
  resolve: (response: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  slackMessageTs?: string;
  slackChannelId?: string;
  createdAt: number;
}