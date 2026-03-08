"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongodbProviders = exports.MONGO_CONNECTION = void 0;
const config_1 = require("@nestjs/config");
const mongoose_1 = require("mongoose");
exports.MONGO_CONNECTION = 'MONGO_CONNECTION';
exports.mongodbProviders = [
    {
        provide: exports.MONGO_CONNECTION,
        inject: [config_1.ConfigService],
        useFactory: async (configService) => {
            const uri = configService.get('database.uri');
            if (!uri) {
                throw new Error('Missing database.uri configuration');
            }
            return (0, mongoose_1.createConnection)(uri).asPromise();
        },
    },
];
//# sourceMappingURL=mongodb.providers.js.map