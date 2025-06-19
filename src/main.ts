import * as core from '@actions/core'
import * as coreCommand from '@actions/core/lib/command'
import * as path from 'path'
import * as fs from 'fs'
import * as stateHelper from './state-helper'
import { execSync } from 'child_process'

async function run(): Promise<void> {
  try {
    core.info(`running`)
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

async function cleanup(): Promise<void> {
  try {
    core.info(`cleaning up`)
    core.info(`Executing post action...`)

    const scriptPath = path.join(__dirname, '../scripts/collect_observables.sh')

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Post script not found at: ${scriptPath}`)
    }

    execSync(`bash ${scriptPath}`, { stdio: 'inherit' })
    core.info(`Done`)
  } catch (error) {
    core.warning(`${(error as any)?.message ?? error}`)
  }
}

// Main
if (!stateHelper.IsPost) {
  run()
}
// Post
else {
  cleanup()
}
