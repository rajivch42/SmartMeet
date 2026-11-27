export interface CaptureRequest {
  meetingId: string;
  meetingUrl: string;
  botName?: string;
}

export interface CaptureResponse {
  botId: string;
  status: string;
  isRealBot?: boolean;
}

export interface MeetingCaptureProvider {
  name: 'recall' | 'own';
  dispatch(req: CaptureRequest): Promise<CaptureResponse>;
  stop(botId: string): Promise<{ success: boolean; message?: string }>;
}
