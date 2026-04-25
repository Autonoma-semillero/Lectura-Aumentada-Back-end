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
exports.ProgressService = void 0;
const common_1 = require("@nestjs/common");
const progress_tokens_1 = require("../domain/constants/progress.tokens");
let ProgressService = class ProgressService {
    constructor(progressRepository) {
        this.progressRepository = progressRepository;
    }
    async listByUser(userId) {
        return this.progressRepository.listByUser(userId);
    }
    async create(dto) {
        return this.progressRepository.create({
            user_id: dto.user_id,
            learning_unit_id: dto.learning_unit_id,
            session_id: dto.session_id,
            action: dto.action,
            ts: dto.ts,
            payload: dto.payload,
            device: dto.device,
        });
    }
};
exports.ProgressService = ProgressService;
exports.ProgressService = ProgressService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(progress_tokens_1.PROGRESS_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], ProgressService);
//# sourceMappingURL=progress.service.js.map