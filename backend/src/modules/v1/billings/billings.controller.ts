import {
  Controller,
  Get,
  Body,
  Post,
  Delete,
  Param,
  Query,
  Patch,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import { BillingsService } from './billings.service';
import {
  CreateBillingDto,
  UpdateBillingDto,
  BillingListDto,
  BillingPaginatedDto,
  BillingDto,
  SingleQueryDto,
  SessionPaymentIntentDto,
  BillingPaymentIntentDto,
  UpdateBillingNotesDto,
  UpdateBillingStatusDto,
} from '@shared/dtos';
import { Billing } from './entities/billing.entity';
import { AuthUser } from '@/decorators/user.decorator';
import { User } from '@/common/base-user/entities/user.entity';
import { EUserLevels } from '@shared/enums';
import { MembersService } from '../members/members.service';
import { LinkMemberService } from '../members/services/link-member.service';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import { MinUserLevel } from '@/decorators/level.decorator';
import { Timezone } from '@/decorators/timezone.decorator';
import { RequirePermissions, Resource, SkipPermissions } from '@/decorators';
import { EPermissionAction, EResource } from '@shared/enums';

@ApiTags('Billings')
@MinUserLevel(EUserLevels.ADMIN)
@Resource(EResource.BILLINGS)
@Controller('billings')
export class BillingsController {
  constructor(
    private readonly billingsService: BillingsService,
    private readonly membersService: MembersService,
    private readonly linkMemberService: LinkMemberService,
  ) { }

  @ApiOperation({ summary: 'Get all billings with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of billings',
    type: BillingPaginatedDto,
  })
  @Get()
  @MinUserLevel(EUserLevels.MEMBER)
  async findAll(@Query() query: BillingListDto, @AuthUser() currentUser: User) {
    const isAdmin =
      currentUser.level === (EUserLevels.PLATFORM_OWNER as number) || currentUser.level === (EUserLevels.ADMIN as number);

    const result = await this.billingsService.get(query, BillingListDto, {
      beforeQuery: (query: SelectQueryBuilder<Billing>) => {
        if (!isAdmin) {
          query.leftJoin('entity.recipientUser', '_recipientUser').andWhere(
            new Brackets((qb2) => {
              qb2
                .where('_recipientUser.id = :uid', {
                  uid: currentUser.id,
                });
            }),
          );
        }
      },
    }, {
      skipSuperAdminOwnDataOnly: true,
    });

    for (const b of result.data) {
      const { status } = await this.billingsService.getBillingStatus(b.id);
      (b as Billing & { status?: string }).status = status ?? undefined;
    }

    return result;
  }

  @ApiOperation({ summary: 'Get billings for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID (recipient user)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of billings for the user',
    type: BillingPaginatedDto,
  })
  @Get('user/:userId')
  async getUserBillings(
    @Param('userId') userId: string,
    @Query() query: BillingListDto,
    @AuthUser() currentUser: User,
  ) {
    const isAdmin = currentUser.level === (EUserLevels.PLATFORM_OWNER as number) 
             || currentUser.level === (EUserLevels.SUPER_ADMIN as number) || currentUser.level === (EUserLevels.ADMIN as number);

    const {linkedMemberId, ...restQuery} = query;

    // Check if current user has access to this user's billings
    // Either they are the user, or they are a linked member
    let hasAccess = false;

    if (isAdmin) {
      hasAccess = true;
    } else if (currentUser.id === userId) {
      hasAccess = true;
    } else {
      const isMember = currentUser.level === EUserLevels.MEMBER;
      if (isMember && linkedMemberId) {
        const linkedMember = await this.linkMemberService.findOne(linkedMemberId, currentUser, {
          _relations: ['linkedMember.user'],
        });
        if (!linkedMember.linkedMember.user) throw new NotFoundException('Linked member not found');
        if (linkedMember.linkedMember.user.id === userId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to view these billings');
    }

    return this.billingsService.get(
      {
        ...restQuery,
      } as BillingListDto,
      BillingListDto,
      {
        beforeQuery: (queryBuilder: SelectQueryBuilder<Billing>) => {
          queryBuilder.andWhere('entity.recipientUserId = :userId', { userId });
          return queryBuilder;
        },
      },
    );
  }

  @ApiOperation({ summary: 'Get billing by ID' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns billing by ID',
    type: BillingDto,
  })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  @Get(':id')
  @MinUserLevel(EUserLevels.MEMBER)
  async findOne(
    @Param('id') id: string,
    @Query() query: SingleQueryDto<Billing>,
  ) {
    const billing = await this.billingsService.getSingle(id, query);
    if (!billing) throw new NotFoundException('Billing not found');
    const { status } = await this.billingsService.getBillingStatus(id);
    return { ...billing, status: status ?? undefined };
  }

  @ApiOperation({ summary: 'Add a new billing' })
  @ApiBody({
    type: CreateBillingDto,
    description: 'Create a new billing',
  })
  @ApiResponse({ status: 201, description: 'Billing created successfully' })
  @Post()
  create(@Body() createBillingDto: CreateBillingDto) {
    return this.billingsService.createBilling(createBillingDto);
  }

  @ApiOperation({ summary: 'Update billing by ID' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiBody({
    type: UpdateBillingDto,
    description: 'Update billing information',
  })
  @ApiResponse({ status: 200, description: 'Billing updated successfully' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBillingDto: UpdateBillingDto, @AuthUser() currentUser: User) {
    return this.billingsService.updateBilling(id, updateBillingDto, currentUser);
  }

  @ApiOperation({ summary: 'Delete billing by ID' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiResponse({ status: 200, description: 'Billing deleted successfully' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  @Delete(':id')
  async remove(@Param('id') id: string, @AuthUser() currentUser: User) {
    await this.billingsService.delete(id);
  }

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Send billing email to recipient' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  async sendBillingEmail(@Param('id') id: string) {
    return this.billingsService.sendBillingEmail(id);
  }

  @ApiOperation({ summary: 'Create payment intent for a session' })
  @ApiBody({ type: SessionPaymentIntentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created',
  })
  @Post('payment-intent')
  @MinUserLevel(EUserLevels.MEMBER)
  @RequirePermissions(`${EResource.BILLINGS}:${EPermissionAction.READ}`)
  async createBillingPaymentIntent(
    @Body() billingPaymentIntentDto: BillingPaymentIntentDto,
    @AuthUser() currentUser: User,
    @Timezone() timezone: string,
  ) {


    return this.billingsService.createBillingPaymentIntent(
      billingPaymentIntentDto,
      currentUser,
      timezone,
      {},
    );
  }

  @ApiOperation({ summary: 'Update billing notes' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiBody({
    type: UpdateBillingNotesDto,
    description: 'Update billing notes',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing notes updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  @Patch('notes/:id')
  @MinUserLevel(EUserLevels.MEMBER)
  async updateBillingNotes(
    @Param('id') id: string,
    @Body() updateNotesDto: UpdateBillingNotesDto,
  ) {
    return this.billingsService.updateBillingNotes(id, updateNotesDto);
  }

  @ApiOperation({ summary: 'Update billing status (for cashable billings)' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiBody({
    type: UpdateBillingStatusDto,
    description: 'Update billing status',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  @ApiResponse({
    status: 403,
    description: 'Billing is not cashable or unauthorized',
  })
  @Patch('status/:id')
  updateBillingStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateBillingStatusDto,
    @AuthUser() currentUser: User,
    @Timezone() timezone: string,
  ): Promise<{ message: string }> {
    return this.billingsService.updateBillingStatus(
      id,
      updateStatusDto,
      currentUser,
      timezone,
    );
  }


  @ApiOperation({ summary: 'Get current billing status for a billing' })
  @ApiParam({ name: 'id', description: 'Billing ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns current billing status from latest history entry',
  })
  @Get(':id/status')
  @MinUserLevel(EUserLevels.STAFF)
  async getBillingStatus(@Param('id') id: string) {
    return this.billingsService.getBillingStatus(id);
  }

  @ApiOperation({ summary: 'Get recent billings with total outstanding for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns recent billings and total outstanding amount',
  })
  @Get('user/:userId/recent')
  @MinUserLevel(EUserLevels.ADMIN)
  async getOutstandingBillingSummary(
    @Param('userId') userId: string,
    @Query() query: { limit?: number },
  ) {
    return this.billingsService.getOutstandingBillingSummary(userId, query);
  }

  @ApiOperation({ summary: 'Get my outstanding billings summary (for current logged-in user)' })
  @ApiResponse({
    status: 200,
    description: 'Returns recent billings and total outstanding amount for current user',
  })
  @Get('me/outstanding')
  @MinUserLevel(EUserLevels.MEMBER)
  async getMyOutstandingBillingSummary(
    @AuthUser() currentUser: User,
    @Query() query: { limit?: number },
  ) {
    return this.billingsService.getOutstandingBillingSummary(currentUser.id, query);
  }
}
