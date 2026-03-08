"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("mongoose");
const mongodb_providers_1 = require("../../../../database/mongodb.providers");
let AuthRepository = class AuthRepository {
    constructor(connection, jwtService) {
        this.connection = connection;
        this.jwtService = jwtService;
    }
    async validateUser(_email, _password) {
        void this.connection;
        return null;
    }
    async createSession(_userId, _token) {
        void this.connection;
    }
    async revokeSession(_token) {
        void this.connection;
    }
    async issueTokens(payload) {
        const accessToken = await this.jwtService.signAsync(payload);
        return { accessToken };
    }
};
exports.AuthRepository = AuthRepository;
exports.AuthRepository = AuthRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(mongodb_providers_1.MONGO_CONNECTION)),
    __metadata("design:paramtypes", [mongoose_1.Connection,
        jwt_1.JwtService])
], AuthRepository);
//# sourceMappingURL=auth.repository.js.map