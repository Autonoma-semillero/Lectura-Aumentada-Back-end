"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const assets_module_1 = require("./modules/assets/assets.module");
const auth_module_1 = require("./modules/auth/auth.module");
const database_config_1 = require("./config/database.config");
const env_config_1 = require("./config/env.config");
const jwt_config_1 = require("./config/jwt.config");
const mongodb_module_1 = require("./database/mongodb.module");
const learning_units_module_1 = require("./modules/learning-units/learning-units.module");
const progress_module_1 = require("./modules/progress/progress.module");
const categories_module_1 = require("./modules/categories/categories.module");
const doman_module_1 = require("./modules/doman/doman.module");
const users_module_1 = require("./modules/users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [env_config_1.default, database_config_1.default, jwt_config_1.default],
            }),
            mongodb_module_1.MongoDbModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            learning_units_module_1.LearningUnitsModule,
            progress_module_1.ProgressModule,
            assets_module_1.AssetsModule,
            categories_module_1.CategoriesModule,
            doman_module_1.DomanModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map