"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningUnitsModule = void 0;
const common_1 = require("@nestjs/common");
const learning_units_service_1 = require("./application/learning-units.service");
const learning_units_tokens_1 = require("./domain/constants/learning-units.tokens");
const learning_units_repository_1 = require("./infrastructure/repositories/learning-units.repository");
const learning_units_controller_1 = require("./presentation/learning-units.controller");
let LearningUnitsModule = class LearningUnitsModule {
};
exports.LearningUnitsModule = LearningUnitsModule;
exports.LearningUnitsModule = LearningUnitsModule = __decorate([
    (0, common_1.Module)({
        controllers: [learning_units_controller_1.LearningUnitsController],
        providers: [
            learning_units_service_1.LearningUnitsService,
            {
                provide: learning_units_tokens_1.LEARNING_UNITS_REPOSITORY,
                useClass: learning_units_repository_1.LearningUnitsRepository,
            },
        ],
        exports: [learning_units_service_1.LearningUnitsService],
    })
], LearningUnitsModule);
//# sourceMappingURL=learning-units.module.js.map