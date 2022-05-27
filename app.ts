import { App, LogLevel, onlyActions } from '@slack/bolt'
import { createInstallationStore, generateDates } from './utils'
import createSchedulerView from './utils/createSchedulerView'
// import { v4 as uuid } from 'uuid'

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

const PORT = 5000

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'remind-me-secret',
  scopes: ['chat:write', 'commands', 'chat:write.public'],
  port: PORT,
  logLevel: LogLevel.DEBUG,
  // customRoutes: generateCustomRoutes(),
  installationStore: createInstallationStore(),
  installerOptions: {
    redirectUriPath: '/slack/redirect',
  },
})

/**
 * Opens modal to gather user information for scheduling messages
 */

app.command('/schedule', async ({ ack, body, context, logger, client }) => {
  await ack()

  try {
    await client.views.open({
      token: context.botToken,
      trigger_id: body.trigger_id,
      view: createSchedulerView(),
    })
  } catch (error) {
    logger.error(error)
  }
})

app.action('users_select-action', async ({ ack }) => await ack())

app.view('schedule', async ({ ack, body, view, client, logger }) => {
  await ack()

  const submission = view.state.values
  const message = submission.message.ml_input.value
  const recipient = submission.recipient['users_select-action']['selected_user']
  const time = submission.time['timepicker-action']['selected_time']
  const timezone = submission.timezone['static_select-action']['selected_option']
    ? submission.timezone['static_select-action']['selected_option']['value']
    : 'America/New_York'
  const start = submission['start']['datepicker-action']['selected_date']
  const end = submission['end']['datepicker-action']['selected_date']

  const user = body['user']['id']

  logger.info('>> response: ', message, recipient, time, timezone, start, end)

  if (start && end && time) generateDates(start, end, time, timezone)

  // schedule messages
  // if successful, send "messages scheduled!"
  // else send "sorry i'm struggling, try again later."

  try {
    await client.chat.postMessage({
      channel: user,
      text: 'ok gud.',
    })
  } catch (error) {
    logger.error(error)
  }
})

/**
 * Cancel scheduled messages
 * Parameters: referenceId
 */
// app.command('/cancel', async ({ payload, context, ack, respond }) => {
//   await ack()
//   const { text } = payload
//   const messageIds = cache.get(text.trim())
//   await deleteScheduledMessages(messageIds, context.botToken)
//   await respond('Messages unscheduled.')
// })

// const scheduleMessages = async (id, message, dateArray, token) => {
//   const messageIds = []
//   for (let date of dateArray) {
//     try {
//       const response = await app.client.chat.scheduleMessage({
//         channel: id,
//         text: message,
//         post_at: date,
//         token,
//       })
//       console.log('> Scheduled messaged: ', date, response)
//       messageIds.push([response.scheduled_message_id, id])
//     } catch (error) {
//       console.error('> Ran into error scheduling message for', date, JSON.stringify(error))
//     }
//   }
//   return messageIds
// }

// const deleteScheduledMessages = async (messageArray, token) => {
//   for (let message of messageArray) {
//     try {
//       await app.client.chat.deleteScheduledMessage({
//         channel: message[1],
//         scheduled_message_id: message[0],
//         token,
//       })
//     } catch (error) {
//       console.log('> Ran into error while canceling message ID', message.id, error)
//     }
//   }
// }
;(async () => {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')
})()
