import { defineBackend } from '@aws-amplify/backend'
import { FunctionUrlAuthType, HttpMethod, InvokeMode } from 'aws-cdk-lib/aws-lambda'
import { amplifyTest } from './functions/test/resource'
import { aiExtractJson } from './functions/ai-extract-json/resource'
import { aiChat } from './functions/ai-chat/resource'
import { reportIssue } from './functions/report-issue/resource'
import { aiScopeJudge } from './functions/ai-scope-judge/resource'

/**
 * Amplify Gen 2 backend — functions only.
 * User auth remains on Supabase; this stack does not define Cognito.
 *
 * CORS is configured only on the Function URL. Do not also set
 * Access-Control-* headers in the Lambda handler — AWS merges both and can
 * produce an invalid value like: *, https://www.example.com
 */
const backend = defineBackend({
  amplifyTest,
  aiExtractJson,
  aiChat,
  reportIssue,
  aiScopeJudge,
})

const cors = {
  allowedOrigins: ['*'],
  allowedHeaders: ['authorization', 'content-type'],
  allowedMethods: [HttpMethod.POST],
}

const testFunctionUrl = backend.amplifyTest.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors,
})

const aiExtractJsonUrl = backend.aiExtractJson.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors,
})

const aiChatUrl = backend.aiChat.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors,
  invokeMode: InvokeMode.RESPONSE_STREAM,
})

const reportIssueUrl = backend.reportIssue.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors,
})

const aiScopeJudgeUrl = backend.aiScopeJudge.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors,
})

backend.addOutput({
  custom: {
    testFunctionUrl: testFunctionUrl.url,
    aiExtractJsonUrl: aiExtractJsonUrl.url,
    aiChatUrl: aiChatUrl.url,
    reportIssueUrl: reportIssueUrl.url,
    aiScopeJudgeUrl: aiScopeJudgeUrl.url,
  },
})
