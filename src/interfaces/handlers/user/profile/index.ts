// src/interfaces/handlers/user/profile/index.ts

import { APIGatewayProxyHandler } from 'aws-lambda';
import { handler as getHandler } from './get';
import { handler as createHandler } from './post';
import { handler as updateHandler } from './put';

export const lambdaHandler: APIGatewayProxyHandler = async (event) => {
  const { httpMethod, resource } = event;

  // CreateProfile: POST /user/profile
  if (httpMethod === "POST" && resource === "/user/profile") {
    return await createHandler(event);
  }

  // UpdateProfile: PUT /user/profile
  if (httpMethod === "PUT" && resource === "/user/profile") {
    return await updateHandler(event);
  }

  // GetProfile: GET /user/profile/{userId}
  if (httpMethod === "GET" && resource === "/user/profile/{userId}") {
    return await getHandler(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ message: "Not found" }),
  };
};
