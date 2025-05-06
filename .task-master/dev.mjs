#!/usr/bin/env node

import { program } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

const DEFAULT_TASKS_FILE = join(process.cwd(), '.task-master', 'tasks', 'tasks.json');

program
  .version('1.0.0')
  .description('Task management CLI tool');

program
  .command('set-status')
  .description('Set the status of a task')
  .requiredOption('--id <id>', 'Task ID')
  .requiredOption('--status <status>', 'New status')
  .option('--file <file>', 'Tasks file path', DEFAULT_TASKS_FILE)
  .action(async (options) => {
    const spinner = ora('Updating task status...').start();
    try {
      const tasksData = await readFile(options.file, 'utf8');
      const tasks = JSON.parse(tasksData);

      const task = tasks.find(t => t.id === parseInt(options.id));
      if (!task) {
        spinner.fail(chalk.red(`No task found with ID ${options.id}`));
        return;
      }

      task.status = options.status;
      await writeFile(options.file, JSON.stringify(tasks, null, 2));

      spinner.succeed(chalk.green(`Updated task ${options.id} status to ${options.status}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to update task status'));
      console.error(error);
    }
  });

program.parse(process.argv);