import { ActionType, ExecutionType, LoopOnItemsStepOutput, ProjectId, StepOutput, StepOutputStatus, isNil } from '@activepieces/shared'

export enum ExecutionVerdict {
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
}

export type EngineConstantData = {
    flowRunId: string
    serverUrl: string
    apiUrl: string
    executionType: ExecutionType
    workerToken: string
    projectId: ProjectId
    flowId: string
    resumePayload?: unknown
    baseCodeDirectory: string
}


type FlowExecutorOutputData = {
    tasks: number
    tags: readonly string[]
    steps: Readonly<Record<string, StepOutput>>
    currentState: Record<string, unknown>
    verdict: ExecutionVerdict
    currentPath: StepExecutionPath
}


export class StepExecutionPath {

    private _path: [string, number][]

    constructor(_path: [string, number][]) {
        this._path = _path
    }

    get path(): [string, number][] {
        return this._path
    }

    loopIteration({ loopName, iteration }: { loopName: string, iteration: number }): StepExecutionPath {
        return new StepExecutionPath([...this._path, [loopName, iteration]])
    }

    removeLast(): StepExecutionPath {
        return new StepExecutionPath(this._path.slice(0, -1))
    }

    static empty(): StepExecutionPath {
        return new StepExecutionPath([])
    }
}

export class FlowExecutorContext {
    private data: FlowExecutorOutputData

    constructor(data: FlowExecutorOutputData) {
        this.data = data
    }

    get verdict(): ExecutionVerdict {
        return this.data.verdict
    }

    get tasks(): number {
        return this.data.tasks
    }

    get tags(): readonly string[] {
        return this.data.tags
    }

    get currentPath(): StepExecutionPath {
        return this.data.currentPath
    }

    get currentState(): Record<string, unknown> {
        return this.data.currentState
    }

    get steps(): Readonly<Record<string, StepOutput>> {
        return this.data.steps
    }

    isCompleted({ stepName }: { stepName: string }): boolean {
        const stateAtPath = getStateAtPath({ currentPath: this.data.currentPath, steps: this.data.steps })
        const stepOutput = stateAtPath[stepName]
        if (isNil(stepOutput)) {
            return false
        }
        // TODO FIX when there is three states
        return stepOutput.status !== StepOutputStatus.PAUSED
    }

    addTags(tags: string[]): FlowExecutorContext {
        return new FlowExecutorContext({
            ...this.data,
            tags: [...this.data.tags, ...tags].filter((value, index, self) => {
                return self.indexOf(value) === index
            }),
        })
    }

    upsertStep(stepName: string, stepOutput: StepOutput): FlowExecutorContext {
        const steps = {
            ...this.data.steps,
        }
        // TODO REWRITE IT IN MORE DECLARATIVE WAY
        const targetMap = getStateAtPath({ currentPath: this.data.currentPath, steps })
        targetMap[stepName] = stepOutput

        return new FlowExecutorContext({
            ...this.data,
            tasks: this.data.tasks + 1,
            currentState: {
                ...this.data.currentState,
                [stepName]: stepOutput.output,
            },
            steps,
        })
    }

    setCurrentPath(currentStatePath: StepExecutionPath): FlowExecutorContext {
        return new FlowExecutorContext({
            ...this.data,
            currentPath: currentStatePath,
        })
    }

    setVerdict(verdict: ExecutionVerdict): FlowExecutorContext {
        return new FlowExecutorContext({
            ...this.data,
            verdict,
        })
    }

    static empty(): FlowExecutorContext {
        return new FlowExecutorContext({
            tasks: 0,
            currentPath: StepExecutionPath.empty(),
            tags: [],
            steps: {},
            currentState: {},
            verdict: ExecutionVerdict.SUCCEEDED,
        })
    }
}

function getStateAtPath({ currentPath, steps }: { currentPath: StepExecutionPath, steps: Record<string, StepOutput> }): Record<string, StepOutput> {
    let targetMap = steps
    currentPath.path.forEach(([stepName, iteration]) => {
        const stepOutput = targetMap[stepName]
        if (stepOutput.type !== ActionType.LOOP_ON_ITEMS) {
            throw new Error('[ExecutionState#getTargetMap] Not instance of Loop On Items step output')
        }
        // TODO CASTING SHOULDN"T BE NEEDED
        const loopOutput = stepOutput as LoopOnItemsStepOutput
        targetMap = loopOutput.output!.iterations[iteration]
    })
    return targetMap
}
