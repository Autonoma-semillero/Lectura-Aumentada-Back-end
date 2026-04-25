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
exports.CreateProgressLogDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreateProgressLogDto {
}
exports.CreateProgressLogDto = CreateProgressLogDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ObjectId del usuario' }),
    __metadata("design:type", String)
], CreateProgressLogDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ObjectId de la unidad de aprendizaje' }),
    __metadata("design:type", String)
], CreateProgressLogDto.prototype, "learning_unit_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ObjectId de la sesión de producto/AR' }),
    __metadata("design:type", String)
], CreateProgressLogDto.prototype, "session_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'marker_detected' }),
    __metadata("design:type", String)
], CreateProgressLogDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], CreateProgressLogDto.prototype, "ts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: 'object', additionalProperties: true }),
    __metadata("design:type", Object)
], CreateProgressLogDto.prototype, "payload", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], CreateProgressLogDto.prototype, "device", void 0);
//# sourceMappingURL=create-progress-log.dto.js.map