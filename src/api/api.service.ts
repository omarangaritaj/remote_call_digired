// src/api/api.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, HttpStatusCode } from 'axios';
import { ApiResponse, UserLocation } from '../user/user.service';
import * as process from 'node:process';

export interface SwitchEventPayload {
  location: UserLocation;
  branchId: string;
  isMultiService: boolean;
  status: string;
}

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);
  private readonly apiUrl: string;
  private readonly apiEndpoint: string;
  private readonly deviceId: string;
  private readonly userAgent: string;

  constructor(private readonly httpService: HttpService) {
    this.apiUrl = process.env.API_URL || '';
    this.apiEndpoint = process.env.API_ENDPOINT || '';
    this.deviceId = process.env.DEVICE_ID || '';
    this.userAgent = `RaspberryPi-GPIO-Controller-NestJS/1.0/${this.deviceId}`;
  }

  async fetchUsers(): Promise<ApiResponse> {
    const url = `${this.apiUrl}/${this.apiEndpoint}`;
    this.logger.log(`📡 Fetching users`);

    const response: AxiosResponse<ApiResponse> = await firstValueFrom(
      this.httpService.post(
        url,
        { branchId: this.deviceId },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
          },
        },
      ),
    );

    if (response.status !== HttpStatusCode.Created) {
      throw new Error(`API returned status ${response.status}`);
    }

    this.logger.log(`✅ Successfully fetched users from API`);
    return response.data;
  }

  async sendSwitchEvent(payload: SwitchEventPayload, accessToken: string) {
    try {
      const url = `${this.apiUrl}/api/v1/companies/${process.env.COMPANY_ID}/queues/call-external`;

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': this.userAgent,
          },
        }),
      );

      if ([HttpStatusCode.Ok, HttpStatusCode.Created].includes(response.status)) {
        this.logger.log('✅ Switch event sent successfully to API');
      } else {
        this.logger.warn(`⚠️ API responded with status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error('❌ Failed to send switch event to API:', error);
      throw error;
    }
  }
}
