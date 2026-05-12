import { Worker } from '@temporalio/worker';
import { createLogger } from '@aasop/observability';
import * as activities from './activities/index.js';
import * as workflows from './workflows/index.js';

const logger = createLogger('workflow-worker');

async function main() {
  const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
  const taskQueue = process.env.TASK_QUEUE || 'aasop-tasks';

  const worker = await Worker.create({
    workflowsPath: new URL('./workflows/index.js', import.meta.url).pathname,
    activities,
    taskQueue,
    maxConcurrentActivityTaskExecutions: parseInt(process.env.MAX_CONCURRENT_ACTIVITIES || '100', 10),
    maxConcurrentWorkflowTaskExecutions: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '50', 10),
    workflowBundle: undefined,
    connection: undefined,
    namespace,
    maxCachedWorkflows: 500,
  });

  logger.info({ temporalAddress, namespace, taskQueue }, 'Workflow worker starting');

  await worker.run();
}

main().catch((err) => {
  logger.error(err, 'Workflow worker failed');
  process.exit(1);
});
