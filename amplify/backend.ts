import { defineBackend } from '@aws-amplify/backend'
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda'
import { amplifyTest } from './functions/test/resource'

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
})

const testFunctionUrl = backend.amplifyTest.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedHeaders: ['authorization', 'content-type'],
    allowedMethods: [HttpMethod.POST],
  },
})

backend.addOutput({
  custom: {
    testFunctionUrl: testFunctionUrl.url,
  },
})
