import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import {firstValueFrom} from 'rxjs';
import {AxiosResponse} from 'axios';
import {ApiResponse, UserLocation} from '../user/user.service';

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

  constructor(private readonly httpService: HttpService) {
    this.apiUrl = process.env.API_URL || '';
    this.apiEndpoint = process.env.API_ENDPOINT || '';
    this.deviceId = process.env.DEVICE_ID || '';
  }

  async fetchUsers(): Promise<ApiResponse> {
    const url = `${this.apiUrl}/${this.apiEndpoint}`;
    this.logger.log(`📡 Fetching users from: ${url}`);

    const response: AxiosResponse<ApiResponse> = await firstValueFrom(
      this.httpService.get(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.deviceId,
        },
      }),
    );

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    this.logger.log(`✅ Successfully fetched users from API`);
    return response.data;

  }

  async sendSwitchEvent(payload: SwitchEventPayload, accessToken: string): Promise<void> {
    try {
      const url = `${this.apiUrl}/switch-event`; // You may need to adjust this endpoint

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'RaspberryPi-GPIO-Controller-NestJS/1.0',
          },
        }),
      );

      if (response.status === 200 || response.status === 201) {
        this.logger.log('✅ Switch event sent successfully to API');
      } else {
        this.logger.warn(`⚠️ API responded with status ${response.status}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to send switch event to API:', error);
      throw error;
    }
  }
}
