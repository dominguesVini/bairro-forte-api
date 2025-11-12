import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateLocationNotificationDto } from './dto/create-location-notification.dto';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getUserNotifications(
    @CurrentUser() user,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.notificationService.findUserNotifications(
      user.user_id,
      limit || 20,
      offset || 0,
    );
  }

  @Post(':id/read')
  async markNotificationAsRead(
    @Param('id', ParseIntPipe) notificationId: number,
    @CurrentUser() user,
  ) {
    await this.notificationService.markAsRead(notificationId, user.user_id);
    return { success: true };
  }

  @Post('read-all')
  async markAllNotificationsAsRead(@CurrentUser() user) {
    await this.notificationService.markAllAsRead(user.user_id);
    return { success: true };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user) {
    const count = await this.notificationService.countUnread(user.user_id);
    return { count };
  }

  @Post('location')
  async createLocationBasedNotification(
    @Body() notificationData: CreateLocationNotificationDto,
    @CurrentUser() user,
  ) {
    // Enviar a notificação baseada em localização
    const result =
      await this.notificationService.createLocationBasedNotification(
        notificationData.type,
        notificationData.message,
        {
          latitude: notificationData.latitude,
          longitude: notificationData.longitude,
          incidentId: notificationData.incidentId,
          cameraId: notificationData.cameraId,
          reportType: notificationData.reportType,
          reporterUserId: user.user_id, // O usuário atual é o remetente
          maxDistanceKm: notificationData.maxDistanceKm || 5,
        },
      );

    return {
      message: 'Notificação enviada com sucesso',
      status: true,
      notification_id: result.notification.notification_id,
      recipients: result.recipientCount,
    };
  }
}
