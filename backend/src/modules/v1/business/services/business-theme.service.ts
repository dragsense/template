import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { CrudService } from '@/common/crud/crud.service';
import { CrudOptions } from '@/common/crud/interfaces/crud.interface';
import { BusinessTheme } from '../entities/business-theme.entity';
import { RequestContext } from '@/context/request-context';
import { FileUploadService } from '@/common/file-upload/file-upload.service';
import { EFileType, EUserLevels } from '@shared/enums';
import { FileUpload } from '@/common/file-upload/entities/file-upload.entity';
import { CreateBusinessThemeDto, UpdateBusinessThemeDto } from '@shared/dtos/business-dtos/business-theme.dto';
import { User } from '@/common/base-user/entities/user.entity';
import { BusinessService } from '../business.service';
import { Business } from '../entities/business.entity';

@Injectable()
export class BusinessThemeService extends CrudService<BusinessTheme> {
  constructor(
    @InjectRepository(BusinessTheme)
    private readonly businessThemeRepo: Repository<BusinessTheme>,
    private readonly fileUploadService: FileUploadService,
    private readonly businessService: BusinessService,
    moduleRef: ModuleRef,
  ) {
    const crudOptions: CrudOptions = {};
    super(businessThemeRepo, moduleRef, crudOptions);
  }


  getRepository(): Repository<BusinessTheme> {
    return this.businessThemeRepo;
  }

  /**
   * Get current business theme using businessId from request context
   */
  async getCurrentBusinessTheme(): Promise<BusinessTheme | null> {
    const businessId = RequestContext.get<string>('businessId');
    const tenantId = RequestContext.get<string>('tenantId');

    let business: Business | null = null;

    if (businessId) {
      business = await this.businessService.getSingle(businessId);
    }

    if (!business && tenantId) {
      business = await this.businessService.getSingle({ tenantId }, { _relations: ['user'] });
    }

    if (!business) {
      return null;
    }

    return this.getSingle({
      businessId: business.id,
    }, {
      _relations: ['logoLight', 'logoDark', 'favicon'],
    });
  }

  async getMyBusinessTheme(user: User): Promise<BusinessTheme | null> {
    const business = await this.businessService.getMyBusiness(user);
    if (!business) {
      return null;
    }
    return this.getSingle({
      businessId: business.id,
    }, {
      _relations: ['logoLight', 'logoDark', 'favicon'],
    });
  }

  /**
   * Create or update business theme with file uploads
   */
  async upsertBusinessTheme(
    user: User,
    themeData: CreateBusinessThemeDto | UpdateBusinessThemeDto,
    files?: {
      logoLight?: Express.Multer.File[];
      logoDark?: Express.Multer.File[];
      favicon?: Express.Multer.File[];
    },
  ): Promise<BusinessTheme> {
    const business = await this.businessService.getMyBusiness(user);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const existingTheme = await this.getSingle({
      businessId: business.id,
    }, {
      _relations: ['logoLight', 'logoDark', 'favicon'],
    });

    const {
      logoLight: logoLightId,
      logoDark: logoDarkId,
      favicon: faviconId,
      ...restThemeData
    } = themeData;

    const logoLightFile = files?.logoLight?.[0];
    const logoDarkFile = files?.logoDark?.[0];
    const faviconFile = files?.favicon?.[0];

    if (existingTheme) {
      return this.update(existingTheme.id, restThemeData, {
        afterUpdate: async (entity, manager) => {
          const theme = await this.getSingle(existingTheme.id, {
            _relations: ['logoLight', 'logoDark', 'favicon'],
          });

          if (!theme) throw new NotFoundException('Business theme not found');

          const saveFilePromises: Promise<void>[] = [];
          const filesToSave: Array<{ file: Express.Multer.File; fileUpload: FileUpload }> = [];

          // Handle logoLight
          if (logoLightFile) {
            const oldLogo = theme.logoLight;
            const uploaded = await this.fileUploadService.createFile(
              {
                name: logoLightFile.originalname,
                type: EFileType.IMAGE,
                folder: 'business-theme',
              },
              logoLightFile,
              false,
              manager,
            );
            entity.logoLight = uploaded;
            filesToSave.push({ file: logoLightFile, fileUpload: uploaded });

            if (oldLogo) {
              this.fileUploadService.deleteFiles([oldLogo]).catch((error) => {
                this.logger.error(
                  error instanceof Error ? error.message : String(error),
                );
              });
            }
          } else if (logoLightId === null || logoLightId === 'null') {
            const oldLogo = theme.logoLight;
            entity.logoLight = null;
            if (oldLogo) {
              this.fileUploadService.deleteFiles([oldLogo]).catch((error) => {
                this.logger.error(
                  error instanceof Error ? error.message : String(error),
                );
              });
            }
          }

          // Handle logoDark
          if (logoDarkFile) {
            const oldLogo = theme.logoDark;
            const uploaded = await this.fileUploadService.createFile(
              {
                name: logoDarkFile.originalname,
                type: EFileType.IMAGE,
                folder: 'business-theme',
              },
              logoDarkFile,
              false,
              manager,
            );
            entity.logoDark = uploaded;
            filesToSave.push({ file: logoDarkFile, fileUpload: uploaded });

            if (oldLogo) {
              this.fileUploadService.deleteFiles([oldLogo]).catch((error) => {
                this.logger.error(
                  error instanceof Error ? error.message : String(error),
                );
              });
            }
          } else if (logoDarkId === null || logoDarkId === 'null') {
            const oldLogo = theme.logoDark;
            entity.logoDark = null;
            if (oldLogo) {
              this.fileUploadService.deleteFiles([oldLogo]).catch((error) => {
                this.logger.error(
                  error instanceof Error ? error.message : String(error),
                );
              });
            }
          }

          // Handle favicon
          if (faviconFile) {
            const oldFavicon = theme.favicon;
            const uploaded = await this.fileUploadService.createFile(
              {
                name: faviconFile.originalname,
                type: EFileType.IMAGE,
                folder: 'business-theme',
              },
              faviconFile,
              false,
              manager,
            );
            entity.favicon = uploaded;
            filesToSave.push({ file: faviconFile, fileUpload: uploaded });

            if (oldFavicon) {
              this.fileUploadService.deleteFiles([oldFavicon]).catch((error) => {
                this.logger.error(
                  error instanceof Error ? error.message : String(error),
                );
              });
            }
          } else if (faviconId === null || faviconId === 'null') {
            const oldFavicon = theme.favicon;
            entity.favicon = null;
            if (oldFavicon) {
              this.fileUploadService.deleteFiles([oldFavicon]).catch((error) => {
                this.logger.error(
                  error instanceof Error ? error.message : String(error),
                );
              });
            }
          }

          await manager.save(entity);

          if (filesToSave.length > 0) {
            await this.fileUploadService.saveFiles(filesToSave);
          }
        },
      });
    } else {
      return this.create(
        {
          businessId: business.id,
          ...restThemeData,
        },
        {
          afterCreate: async (entity, manager) => {
            const filesToSave: Array<{ file: Express.Multer.File; fileUpload: FileUpload }> = [];

            // Handle logoLight
            if (logoLightFile) {
              const uploaded = await this.fileUploadService.createFile(
                {
                  name: logoLightFile.originalname,
                  type: EFileType.IMAGE,
                  folder: 'business-theme',
                },
                logoLightFile,
                false,
                manager,
              );
              entity.logoLight = uploaded;
              filesToSave.push({ file: logoLightFile, fileUpload: uploaded });
            }

            // Handle logoDark
            if (logoDarkFile) {
              const uploaded = await this.fileUploadService.createFile(
                {
                  name: logoDarkFile.originalname,
                  type: EFileType.IMAGE,
                  folder: 'business-theme',
                },
                logoDarkFile,
                false,
                manager,
              );
              entity.logoDark = uploaded;
              filesToSave.push({ file: logoDarkFile, fileUpload: uploaded });
            }

            // Handle favicon
            if (faviconFile) {
              const uploaded = await this.fileUploadService.createFile(
                {
                  name: faviconFile.originalname,
                  type: EFileType.IMAGE,
                  folder: 'business-theme',
                },
                faviconFile,
                false,
                manager,
              );
              entity.favicon = uploaded;
              filesToSave.push({ file: faviconFile, fileUpload: uploaded });
            }

            await manager.save(entity);

            if (filesToSave.length > 0) {
              await this.fileUploadService.saveFiles(filesToSave);
            }
          },
        },
      );
    }
  }
}
