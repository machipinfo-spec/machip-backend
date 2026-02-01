export interface PushNotificationData {
    title: string;
    body: string;
    data?: { [key: string]: string };
}

export interface IPushNotificationService {
    sendToUser(userId: string, notification: PushNotificationData): Promise<void>;
    sendToUsers(userIds: string[], notification: PushNotificationData): Promise<void>;
}
