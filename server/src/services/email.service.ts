import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

interface HotspotForEmail {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  importance: string;
  relevance: number;
  summary: string | null;
  createdAt: Date;
  keyword?: { text: string } | null;
}

@Injectable()
export class EmailService {
  private transporter: any = null;

  private getTransporter(): any {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email configuration incomplete, notifications disabled');
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }

    return this.transporter;
  }

  async sendHotspotEmail(hotspot: HotspotForEmail): Promise<boolean> {
    const mailer = this.getTransporter();
    if (!mailer || !process.env.NOTIFY_EMAIL) return false;

    const importanceEmoji: Record<string, string> = {
      low: '📌', medium: '⚡', high: '🔥', urgent: '🚨',
    };
    const emoji = importanceEmoji[hotspot.importance] || '📌';

    try {
      await mailer.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.NOTIFY_EMAIL,
        subject: `${emoji} 热点监控: ${hotspot.title.slice(0, 50)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
              .badge-urgent { background: #ff4757; color: white; }
              .badge-high { background: #ff6b35; color: white; }
              .badge-medium { background: #ffa502; color: white; }
              .badge-low { background: #2ed573; color: white; }
              .meta { color: #666; font-size: 14px; margin: 10px 0; }
              .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">${emoji} 发现新热点</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">来自热点监控系统</p>
              </div>
              <div class="content">
                <h2 style="margin-top: 0;">${hotspot.title}</h2>
                <p><span class="badge badge-${hotspot.importance}">${hotspot.importance.toUpperCase()}</span></p>
                ${hotspot.summary ? `<p><strong>摘要：</strong>${hotspot.summary}</p>` : ''}
                <div class="meta">
                  <p><strong>来源：</strong>${hotspot.source}</p>
                  <p><strong>相关性评分：</strong>${hotspot.relevance}/100</p>
                  ${hotspot.keyword ? `<p><strong>关键词：</strong>${hotspot.keyword.text}</p>` : ''}
                  <p><strong>发现时间：</strong>${new Date(hotspot.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <a href="${hotspot.url}" class="button">查看原文 →</a>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log(`Email sent for hotspot: ${hotspot.id}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendDigestEmail(hotspots: HotspotForEmail[]): Promise<boolean> {
    const mailer = this.getTransporter();
    if (!mailer || !process.env.NOTIFY_EMAIL || hotspots.length === 0) return false;

    try {
      const hotspotsHtml = hotspots
        .map(
          h => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <a href="${h.url}" style="color: #667eea; text-decoration: none;">${h.title.slice(0, 60)}...</a>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${h.source}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${h.importance}</td>
        </tr>
      `,
        )
        .join('');

      await mailer.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.NOTIFY_EMAIL,
        subject: `📊 热点监控日报 - ${hotspots.length} 条新热点`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h1>📊 热点监控日报</h1>
            <p>过去 24 小时发现 <strong>${hotspots.length}</strong> 条新热点</p>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; text-align: left;">标题</th>
                  <th style="padding: 10px; text-align: left;">来源</th>
                  <th style="padding: 10px; text-align: left;">重要性</th>
                </tr>
              </thead>
              <tbody>${hotspotsHtml}</tbody>
            </table>
          </body>
          </html>
        `,
      });
      return true;
    } catch (error) {
      console.error('Failed to send digest email:', error);
      return false;
    }
  }
}
