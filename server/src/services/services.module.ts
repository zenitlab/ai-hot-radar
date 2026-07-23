import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { TwitterService } from './twitter.service';
import { SearchService } from './search.service';
import { ChinaSearchService } from './china-search.service';
import { EmailService } from './email.service';
import { RssService } from './rss.service';
import { ScoringService } from './scoring.service';
import { RedditService } from './reddit.service';

@Module({
  providers: [AiService, TwitterService, SearchService, ChinaSearchService, EmailService, RssService, ScoringService, RedditService],
  exports: [AiService, TwitterService, SearchService, ChinaSearchService, EmailService, RssService, ScoringService, RedditService],
})
export class ServicesModule {}
