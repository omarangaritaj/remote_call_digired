import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiService } from '../api/api.service';

export interface UserLocation {
    name: string;
    id: string;
    number: number;
}

export interface ApiUser {
    id: string;
    branchId: string;
    location: UserLocation;
    accessToken: string;
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

            // Process each user
            for (const apiUser of apiResponse.users) {
                await this.upsertUser(apiUser);
            }

            this.logger.log('✅ Users synchronized successfully');

        } catch (error) {
            this.logger.error('❌ Failed to fetch and store users:', error);
            throw error;
        }
    }

    private async upsertUser(apiUser: ApiUser): Promise<void> {
        try {
            const locationString = JSON.stringify(apiUser.location);

            const user = await this.prisma.user.upsert({
                where: { id: apiUser.id },
                update: {
                    branchId: apiUser.branchId,
                    location: locationString,
                    accessToken: apiUser.accessToken,
                },
                create: {
                    id: apiUser.id,
                    branchId: apiUser.branchId,
                    location: locationString,
                    accessToken: apiUser.accessToken,
                },
            });

            this.logger.log(`👤 User ${user.id} synchronized`);

        } catch (error) {
            this.logger.error(`Error upserting user ${apiUser.id}:`, error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            const users = await this.prisma.user.findMany();

            return users.map(user => ({
                ...user,
                location: JSON.parse(user.location) as UserLocation,
            }));

        } catch (error) {
            this.logger.error('Error fetching users:', error);
            throw error;
        }
    }

    async getUserById(id: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
            });

            if (!user) {
                return null;
            }

            return {
                ...user,
                location: JSON.parse(user.location) as UserLocation,
            };

        } catch (error) {
            this.logger.error(`Error fetching user ${id}:`, error);
            throw error;
        }
    }

    async getRandomUser() {
        try {
            const users = await this.prisma.user.findMany();

            if (users.length === 0) {
                return null;
            }

            const randomIndex = Math.floor(Math.random() * users.length);
            const user = users[randomIndex];

            return {
                ...user,
                location: JSON.parse(user.location) as UserLocation,
            };

        } catch (error) {
            this.logger.error('Error fetching random user:', error);
            throw error;
        }
    }

    async getUsersCount(): Promise<number> {
        try {
            return await this.prisma.user.count();
        } catch (error) {
            this.logger.error('Error counting users:', error);
            return 0;
        }
    }
}