import { EntitySchema } from 'typeorm'
import { Project } from '@activepieces/shared'
import { ProjectPlan } from '@activepieces/ee-shared'
import { ApIdSchema, BaseColumnSchemaPart, TIMESTAMP_COLUMN_TYPE } from '../../../database/database-common'

export type ProjectPlanSchema = {
    project: Project
} & ProjectPlan

export const ProjectPlanEntity = new EntitySchema<ProjectPlanSchema>({
    name: 'project_plan',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: ApIdSchema,
        flowPlanName: {
            type: String,
        },
        stripeCustomerId: {
            type: String,
        },
        stripeSubscriptionId: {
            type: String,
            nullable: true,
        },
        minimumPollingInterval: {
            type: Number,
        },
        activeFlows: {
            type: Number,
        },
        connections: {
            type: Number,
        },
        teamMembers: {
            type: Number,
        },
        botPlanName: {
            type: String,
        },
        bots: {
            type: Number,
        },
        datasourcesSize: {
            type: Number,
        },
        datasources: {
            type: Number,
        },
        tasks: {
            type: Number,
        },
        tasksPerDay: {
            type: Number,
            nullable: true,
        },
        subscriptionStartDatetime: {
            type: TIMESTAMP_COLUMN_TYPE,
        },
    },
    indices: [
        {
            name: 'idx_plan_project_id',
            columns: ['projectId'],
            unique: true,
        },
        {
            name: 'idx_plan_stripe_customer_id',
            columns: ['stripeCustomerId'],
            unique: true,
        },
    ],
    relations: {
        project: {
            type: 'one-to-one',
            target: 'project',
            cascade: true,
            onDelete: 'CASCADE',
            joinColumn: {
                name: 'projectId',
                referencedColumnName: 'id',
                foreignKeyConstraintName: 'fk_project_plan_project_id',
            },
        },
    },
})
