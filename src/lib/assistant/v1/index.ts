import { createReactAgent, ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { ChatGroq } from '@langchain/groq';
import {
  Annotation,
  BaseCheckpointSaver,
  Command,
  END,
  MemorySaver,
  Messages,
  messagesStateReducer,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

import { config } from '@/config';
import { baseTools, googleTools } from '@/lib/tools';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { LanguageModelLike } from '@langchain/core/language_models/base';
import { DynamicTool, StructuredToolInterface, tool } from '@langchain/core/tools';
import { RunnableToolLike } from '@langchain/core/runnables';
import { z } from 'zod';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { stdout } from 'process';
import { db } from '@/lib/db';
import { ConfigurationSchema } from '../configuration';

const messages = [
  //   new SystemMessage(
  //     `
  //         # System Prompt: Autonomous Email Assistant (AVA)

  // ## Core Directive:
  // You are AVA (Autonomous Virtual Assistant), a highly autonomous AI agent operating silently in the background. Your sole purpose is to process the user's incoming emails, identify actionable tasks, plan their execution, utilize available tools to complete them, and report on actions taken *without any user interaction*. You do not engage in conversation.

  // ## Operational Workflow:

  // 1.  **Email Ingestion & Analysis:**
  //     * Identify the primary objective(s) or task(s) requested or implied within the email.
  //     * Focus solely on actionable items.

  // 2.  **Task Planning & Sequencing:**
  //     * **Deconstruct:** Break down each identified task into the smallest logical, sequential steps required for completion.
  //     * Store the steps using the set_tasks_steps tool
  //     * **Resource Identification:** For each step, determine precisely what information is needed and which specific tool(s) must be used.
  //     * **Dependency Mapping:** Identify any dependencies between steps (e.g., Step B requires the output of Step A).
  //     * **Execution Plan:** Formulate a strict, ordered execution plan based on the deconstruction, resources, and dependencies. *This plan is final.*

  // 3.  **Autonomous Execution:**
  //     * **Initiate Plan:** Begin executing the plan step-by-step using the designated tools.
  //     * **Information Retrieval:** If a step requires information not present in the original email (e.g., checking availability, looking up details), **you must use available tools** (web_search, calendar_api, etc.) to retrieve it *autonomously*. **DO NOT ask the user.**
  //     * **Decision Making:** Act decisively based on the plan and retrieved information. If ambiguity arises that cannot be resolved via tools, proceed with the most logical interpretation based on the context and the goal of maximizing efficiency for the user. Note any significant assumptions made during execution.
  //     * **Tool Interaction:** Interact with tools precisely as needed by the plan. Handle tool outputs and feed them into subsequent steps as required.

  // 4.  **Completion & Reporting:**
  //     * **Task Completion:** Ensure all steps in the plan are executed.
  //     * **Summary Generation:** Create a concise, factual summary outlining:
  //         * The original task(s) identified.
  //         * The actions *you* took.
  //         * The final outcome(s).
  //         * Any significant assumptions made due to ambiguity.
  //     * This summary is for logging or a potential notification system, *not* a request for user feedback.

  // ## Guiding Principles (Non-Negotiable):

  // * **Absolute Autonomy:** You *never* ask the user for clarification, confirmation, or additional information. Your purpose is to act independently.
  // * **Proactive Information Gathering:** Use your tools proactively to fill information gaps. Assume you have the necessary permissions for tool use.
  // * **Decisive Action:** Do not hesitate. Execute the plan confidently.
  // * **Efficiency:** Complete tasks promptly and accurately.
  // * **Silent Operation:** You are a background process. Do not simulate conversation or express uncertainty *to the user*.
  // * **Plan Adherence:** Strictly follow the execution plan derived in Step 2.

  // **You are now activated. Process incoming emails according to these directives.**
  // `.trim()
  //   ),

  new SystemMessage(`

# System Prompt: Autonomous Email Assistant (AVA)
## Core Directive: 
You are to handle the user's incoming emails, identify actionable tasks, plan their execution, utilize available tools to complete them, and report on actions taken without any user interaction. You do not engage in conversation.

you must always log the actions you take and the descisions you make. This is important for accountability and transparency.

before you use any tool, you must tell the user what you are going to do and why. This is important for transparency and accountability. Then you can proceed to call the tool in your next request.

when you are done with all that needs to be done incldue the ##FINISHED## tag in the message

you must walk the user through the steps you take as you are about to take them. This is important for transparency and accountability.

before you request a tool call, make sure you have previosully stated the intent to do so in the previous message. This is important for transparency and accountability. 

    `),
  new SystemMessage(`
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
Incoming Email Below

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''

Hi team,

Just a reminder that we're gearing up for the product launch next week. Here are the key things that still need to be handled:

Finalize the launch announcement email and schedule it.

Prepare demo scripts and walkthrough materials for the sales team.

Coordinate with the dev team to ensure the latest build is deployed to production by Monday.

Schedule a dry-run meeting on Friday with marketing, sales, and product.

Update the website banner with the correct launch date and feature highlights.

Let me know if you need help with anything.
Thanks,
Jane
    `),
];

type PlanStep = {
  title: string;
  completed: boolean;
};

type PlanStepsUpdate = PlanStep[] | { index: number; step: PlanStep };

type CreateTurobModeAgentParams = {
  llm: BaseChatModel;
  tools: (StructuredToolInterface | DynamicTool | RunnableToolLike)[];
  checkpointer: BaseCheckpointSaver;
};

const setTaskSteps = tool(
  async ({ steps }, config) => {
    console.log(steps);
    return new Command({
      update: {
        steps: steps.map(step => ({ title: step, completed: false })),
        messages: [
          new ToolMessage({
            content: 'Task steps successfully set.',
            tool_call_id: config.toolCall.id,
          }),
        ],
      },
    });
  },
  {
    name: 'set_task_steps',
    description:
      'Defines or updates the sequential steps necessary to complete the current task. Use this tool to provide a clear, structured plan the assistant should follow.',
    schema: z.object({
      steps: z
        .array(z.string().describe('A detailed instruction for a single step in the task process.'))
        .describe('An ordered list of individual task steps.'),
    }),
  }
);

const markTaskDone = tool(
  async ({ index }, config) => {
    return new Command({
      update: {
        steps: { index, step: { completed: true } },
        messages: [
          new ToolMessage({
            content: 'Task marked as done.',
            tool_call_id: config.toolCall.id,
          }),
        ],
      },
    });
  },
  {
    name: 'mark_task_step_done',
    description:
      'Marks a specific task step as completed, based on its position in the plan. Uses a 1-based index for task step index',
    schema: z.object({
      index: z.number().min(1).describe('The 1-based index of the task step to mark as completed.'),
    }),
  }
);

function createAgent(params: CreateTurobModeAgentParams) {
  const { tools, llm, checkpointer } = params;

  if (!llm.bindTools) {
    throw new Error('Model should impliment the `bindTools` method.');
  }

  const agentLLM = llm.bindTools(tools);
  const plannerLLM = llm;

  const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[], Messages>({
      reducer: messagesStateReducer,
      default: () => [],
    }),

    steps: Annotation<PlanStep[], PlanStepsUpdate>({
      reducer: (left, right) => {
        if ('index' in right) {
          const index = right.index - 1;
          if (index >= left.length) {
            throw new Error('Out of range error');
          }

          const result = [...left];
          result[index] = { ...result[index], ...right.step };
          return result;
        } else {
          return left.concat(right);
        }
      },
      default: () => [],
    }),

    done: Annotation<boolean>({
      reducer(_, right) {
        return right;
      },
      default: () => false,
    }),
  });

  const toolNode = new ToolNode(tools);

  const llmNode = async (state: typeof StateAnnotation.State) => {
    return {
      messages: [await agentLLM.invoke(state.messages)],
    };
  };

  const plannerNode = async (state: typeof StateAnnotation.State) => {
    const plan = plannerLLM.invoke(
      [
        state.messages[1],
        new SystemMessage(`
        You are a planner, you job it to create plans.
       You have seen the email, go through it and give a detailed plan of action of what you can do for the user based on the tools that will be available.


       The following tools will be availble during the esecution stage.

       ${tools.map(tool => `${tool.name} - ${tool.description}`).join('\n-------------------------------------------------------------\n')}
        `),
      ],
      {
        callbacks: [
          {
            handleLLMNewToken(token, idx, runId, parentRunId, tags, fields) {
              stdout.write(token);
            },
          },
        ],
      }
    );

    return {
      messages: [
        plan,
        new SystemMessage(`
          Execute the plan step by step.
          `),
      ],
    };
  };

  const taskControllerNode = async (state: typeof StateAnnotation.State) => {
    if (state.steps.every(step => step.completed)) {
      return {
        done: true,
      };
    }

    return {
      done: false,
      messages: [
        new SystemMessage(`
You have a couple of steps left to complete.

Here is the list of all steps and their status:

${state.steps
  .map((step, index) => `${index + 1}. ${step.title} - ${step.completed ? 'Completed' : 'Pending'}`)
  .join('\n')}
        
Note: 'Completed' means you have perfomed the step and marked it as done. 'Pending' means you have not performed the step yet.    
        `),
      ],
    };
  };

  const graphBuilder = new StateGraph(StateAnnotation, ConfigurationSchema);

  graphBuilder
    .addNode('planner', plannerNode)
    .addNode('llm', llmNode)
    .addNode('tools', toolNode)
    .addEdge('planner', 'llm')
    // .addNode('task_controller', taskControllerNode)
    .addConditionalEdges('llm', state => {
      const route = toolsCondition(state);

      switch (route) {
        case END:
          const lastMessage = state.messages.at(-1);

          if (
            typeof lastMessage?.content === 'string' &&
            lastMessage.content.includes('##FINISHED##')
          ) {
            return END;
          }

          return 'llm';
        // return 'task_controller';
        default:
          return route;
      }
    })
    // .addConditionalEdges('task_controller', state => {
    //   if (state.done) {
    //     return END;
    //   }
    //   return 'llm';
    // })
    .addEdge('tools', 'llm')
    .addEdge(START, 'planner');

  const graph = graphBuilder.compile({
    checkpointer,
  });

  return graph;
}

type createAssistantInstanceOptions = {
  model?: string;
};

export async function buildAssistant(options: createAssistantInstanceOptions) {
  const checkpointer = PostgresSaver.fromConnString(config.database.url, {
    schema: 'agent',
  });

  await checkpointer.setup();

  const llm = new ChatGroq({
    streaming: true,

    // model: 'mistral-saba-24b',
    model: 'qwen-qwq-32b',
    // model: 'gemma2-9b-it',
    // model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    maxTokens: 500,
    apiKey: config.env.GROQ_API_KEY,
  });

  const agent = createAgent({
    tools: [...Object.values(baseTools), ...Object.values(googleTools)],
    // tools: [],
    llm: llm,
    checkpointer,
  });

  return agent;
}

async function shout() {
  const user = await db.user.findUnique({
    where: { id: 'cmajz8zyy0000me65w70t1orv' },
    include: {
      integrations: {
        include: {
          gmail: true,
          gCalendar: true,
        },
      },
    },
  });

  const context = {
    gmail: {
      messageId: '196dfaa05082e417',
    },
  };

  if (!user) {
    console.log('user not found');
    return;
  }

  const config = { configurable: { user, context, thread_id: '111888oo19779uu77' } };

  // const b = await googleTools.createGmailLabel.invoke(
  //   { labelName: 'To the F, to U, to the C, to the K' },
  //   config
  // );

  // console.log(b);

  // const a = await googleTools.listGmailLabels.invoke({}, config);

  // console.log(a);

  // const c = await googleTools.addCalenderEvent.invoke(
  //   {
  //     description: 'Dude you llm is cooking',
  //     summary: 'We smart, no summary needed',
  //     endTime: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  //     startTime: new Date().toISOString(),
  //   },
  //   config
  // );

  // console.log(c);

  // const e = await googleTools.applyGmailLabel.invoke({ labelId: 'Label_1' }, config);

  const assistant = await buildAssistant({});

  const a = await assistant.invoke({});

  const stream = await assistant.stream({ messages: messages }, config);

  for await (const s of stream) {
    console.log(s);
  }
}

await shout();
