import {
  Controller, Get, Post, Delete,
  Param, Body, Res, HttpCode,
} from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  createSession(@Body() body: { title?: string }) {
    return this.chatService.createSession(body.title);
  }

  @Get('sessions')
  getSessions() {
    return this.chatService.getSessions();
  }

  @Delete('sessions/:id')
  @HttpCode(200)
  deleteSession(@Param('id') id: string) {
    return this.chatService.deleteSession(id);
  }

  @Get('sessions/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  /** SSE streaming endpoint */
  @Post('sessions/:id/stream')
  async streamChat(
    @Param('id') sessionId: string,
    @Body() body: { message: string },
    @Res() res: any,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.streamChat(sessionId, body.message)) {
        res.write(`data: ${chunk}\n`);
      }
    } finally {
      res.end();
    }
  }
}
