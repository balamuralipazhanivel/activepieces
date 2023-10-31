import { LoopOnItemsAction, LoopOnItemsStepOutput, StepOutputStatus, isNil } from '@activepieces/shared'
import { BaseExecutor } from './base-executor'
import { EngineConstantData, ExecutionVerdict, FlowExecutorContext } from './context/flow-execution-context'
import { flowExecutorNew } from './flow-executor'
import { variableService } from '../services/variable-service'


type LoopOnActionResolvedSettings = {
    items: readonly unknown[]
}

export const loopExecutor: BaseExecutor<LoopOnItemsAction> = {
    async handle({
        action,
        executionState,
        constants,
    }: {
        action: LoopOnItemsAction
        executionState: FlowExecutorContext
        constants: EngineConstantData
    }) {
        const { resolvedInput, censoredInput } = await variableService.resolve<LoopOnActionResolvedSettings>({
            unresolvedInput: action.settings,
            executionState,
        })

        // TODO REMOVE STEPOUT
        const stepOutput: LoopOnItemsStepOutput = {
            type: action.type,
            input: censoredInput,
            status: StepOutputStatus.SUCCEEDED,
            output: {
                index: 1,
                item: undefined,
                iterations: [],
            },
        }

        let newExecutionContext = executionState.upsertStep(action.name, stepOutput)
        const firstLoopAction = action.firstLoopAction
        if (isNil(firstLoopAction)) {
            return newExecutionContext
        }

        for (let i = 0; i < resolvedInput.items.length; ++i) {
            // TODO REPLACE STEPOUT WITH FUNCTIONS
            stepOutput.output!.index = i + 1
            stepOutput.output!.item = resolvedInput.items[i]
            stepOutput.output!.iterations.push({})

            const newCurrentPath = newExecutionContext.currentPath.loopIteration({ loopName: action.name, iteration: i  })
            newExecutionContext = newExecutionContext.setCurrentPath(newCurrentPath)

            newExecutionContext = await flowExecutorNew.execute({
                action: firstLoopAction,
                executionState: newExecutionContext,
                constants,
            })
            if (newExecutionContext.verdict === ExecutionVerdict.FAILED) {
                return newExecutionContext
            }

            newExecutionContext = newExecutionContext.setCurrentPath(newExecutionContext.currentPath.removeLast())
        }
        return newExecutionContext
    },
}