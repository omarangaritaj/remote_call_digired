// src/user/user.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiService } from '../api/api.service';
import { SWITCH_PINS } from '../constants/pin.constants';

export interface UserLocation {
  id: string;
  name: string;
  number: number;
}

export interface ApiUser {
  id: string;
  accessToken: string;
  location: UserLocation;
  pin: number;
}

export interface ApiResponse {
  users: ApiUser[];
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: ApiService,
  ) {}

  async fetchAndStoreUsers(): Promise<void> {
    try {
      this.logger.log('📡 Fetching users from API...');

      const apiResponse = await this.apiService.fetchUsers();

      if (!apiResponse.users || !Array.isArray(apiResponse.users)) {
        this.logger.error('Invalid API response format');
        return;
      }

      this.logger.log(`📥 Received ${apiResponse.users.length} users from API`);

       apiResponse.users.map(async (apiUser, index) => {
         await this.upsertUser(apiUser, SWITCH_PINS[index]);
       })

      this.logger.log('✅ Users synchronized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to fetch and store users:', error);
      throw error;
    }
  }

  private async upsertUser(apiUser: ApiUser, switchInput: number): Promise<void> {
    const locationString = JSON.stringify(apiUser.location);

    const user = await this.prisma.user.upsert({
      where: { userId: apiUser.id },
      update: {
        accessToken: apiUser.accessToken,
        location: locationString,
      },
      create: {
        accessToken: apiUser.accessToken,
        location: locationString,
        switchInput,
        userId: apiUser.id,
      },
    });

    this.logger.log(`👤 User ${user?.userId} synchronized`);
  }

  async getUser(switchIndex: number) {
    try {
      const user = await this.prisma.user.findFirst({ where: { switchInput: switchIndex } });

      if (!user) {
        this.logger.error('No users');
        return;
      }

      return {
        ...user,
        location: JSON.parse(user.location),
      };
    } catch (error) {
      this.logger.error('Error fetching random user:', error);
      throw error;
    }
  }
}
