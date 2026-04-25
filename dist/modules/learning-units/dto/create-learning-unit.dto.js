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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateLearningUnitDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreateLearningUnitDto {
}
exports.CreateLearningUnitDto = CreateLearningUnitDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CreateLearningUnitDto.prototype, "word", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ObjectId de categoría' }),
    __metadata("design:type", String)
], CreateLearningUnitDto.prototype, "category_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CreateLearningUnitDto.prototype, "marker_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL o ruta al modelo 3D' }),
    __metadata("design:type", String)
], CreateLearningUnitDto.prototype, "model_3d", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL o ruta al audio de pronunciación' }),
    __metadata("design:type", String)
], CreateLearningUnitDto.prototype, "audio_pronunciacion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: 'object', additionalProperties: true }),
    __metadata("design:type", Object)
], CreateLearningUnitDto.prototype, "metadata_accessibility", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'es' }),
    __metadata("design:type", String)
], CreateLearningUnitDto.prototype, "language", void 0);
//# sourceMappingURL=create-learning-unit.dto.js.map