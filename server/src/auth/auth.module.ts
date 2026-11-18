import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminUsersController, AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/** Global so every module's @UseGuards(AdminGuard) can resolve AuthService. */
@Global()
@Module({
  controllers: [AuthController, AdminUsersController],
  providers: [AuthService, AdminGuard],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}
