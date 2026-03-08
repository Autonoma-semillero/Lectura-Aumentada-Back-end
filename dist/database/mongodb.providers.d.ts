import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
export declare const MONGO_CONNECTION = "MONGO_CONNECTION";
export declare const mongodbProviders: {
    provide: string;
    inject: (typeof ConfigService)[];
    useFactory: (configService: ConfigService) => Promise<Connection>;
}[];
