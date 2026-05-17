import { handleDocumentProxyRequest } from '../src/lib/documentProxy';

export async function GET(request: Request) {
  return handleDocumentProxyRequest(request);
}

export default {
  fetch(request: Request) {
    return handleDocumentProxyRequest(request);
  },
};
