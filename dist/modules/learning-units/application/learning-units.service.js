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
    constructor(repository) {
        this.repository = repository;
    }
    async findAll() {
        return this.repository.findAll();
    }
    async findById(id) {
        return this.repository.findById(id);
    }
    async create(dto) {
        return this.repository.create(dto);
    }
    async update(id, dto) {
        return this.repository.update(id, dto);
    }
};
exports.LearningUnitsService = LearningUnitsService;
exports.LearningUnitsService = LearningUnitsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(learning_units_tokens_1.LEARNING_UNITS_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], LearningUnitsService);
//# sourceMappingURL=learning-units.service.js.map