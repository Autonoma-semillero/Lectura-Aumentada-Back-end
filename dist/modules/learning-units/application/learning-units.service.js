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
exports.LearningUnitsService = void 0;
const common_1 = require("@nestjs/common");
const learning_units_tokens_1 = require("../domain/constants/learning-units.tokens");
let LearningUnitsService = class LearningUnitsService {
    constructor(learningUnitsRepository) {
        this.learningUnitsRepository = learningUnitsRepository;
    }
    async findAll() {
        return this.learningUnitsRepository.findAll();
    }
    async findById(id) {
        return this.learningUnitsRepository.findById(id);
    }
    async create(dto) {
        return this.learningUnitsRepository.create(this.toCreatePayload(dto));
    }
    async update(id, dto) {
        return this.learningUnitsRepository.update(id, this.toUpdatePayload(dto));
    }
    toCreatePayload(dto) {
        return {
            word: dto.word,
            category_id: dto.category_id,
            marker_id: dto.marker_id,
            assets: {
                model_3d: dto.model_3d,
                audio_pronunciacion: dto.audio_pronunciacion,
            },
            metadata_accessibility: dto.metadata_accessibility,
            language: dto.language,
        };
    }
    toUpdatePayload(dto) {
        const payload = {};
        if (dto.word !== undefined) {
            payload.word = dto.word;
        }
        if (dto.category_id !== undefined) {
            payload.category_id = dto.category_id;
        }
        if (dto.marker_id !== undefined) {
            payload.marker_id = dto.marker_id;
        }
        const { model_3d, audio_pronunciacion } = dto;
        if (model_3d !== undefined || audio_pronunciacion !== undefined) {
            payload.assets = {
                model_3d,
                audio_pronunciacion,
            };
        }
        if (dto.metadata_accessibility !== undefined) {
            payload.metadata_accessibility = dto.metadata_accessibility;
        }
        if (dto.language !== undefined) {
            payload.language = dto.language;
        }
        return payload;
    }
};
exports.LearningUnitsService = LearningUnitsService;
exports.LearningUnitsService = LearningUnitsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(learning_units_tokens_1.LEARNING_UNITS_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], LearningUnitsService);
//# sourceMappingURL=learning-units.service.js.map