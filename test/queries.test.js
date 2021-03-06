import { assert } from 'chai';
import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../src';
import { mockReq } from './testutils';

describe('Queries tests', () => {
  const middlewares = [];
  const rnl = new RelayNetworkLayer(middlewares);

  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull query', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: {} },
        sendAsJson: true,
      },
      method: 'POST',
    });
    return assert.isFulfilled(rnl.sendQueries([mockReq()]));
  });

  it('should fail correctly on network failure', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });
    const req1 = mockReq();
    return assert.isFulfilled(
      rnl.sendQueries([req1]).then(() => {
        assert(req1.error instanceof Error);
        assert(/Network connection error/.test(req1.error.message));
      })
    );
  });

  it('should handle error response', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          errors: [{ location: 1, message: 'major error' }],
        },
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    return assert.isFulfilled(
      rnl.sendQueries([req1]).then(() => {
        assert(req1.error instanceof Error, 'should be an error');
      })
    );
  });

  it('should handle server non-2xx errors', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 500,
        body: 'Something went completely wrong.',
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    return assert.isFulfilled(rnl.sendQueries([req1])).then(() => {
      assert(req1.error instanceof Error, 'should be an error');
      assert.equal(req1.error.message, 'Something went completely wrong.');
      assert.equal(req1.error.fetchResponse.status, 500);
    });
  });

  it('should fail on missing `data` property', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {},
        sendAsJson: true,
      },
      method: 'POST',
    });
    return assert.isFulfilled(
      rnl.sendQueries([mockReq()]),
      /^Server response.data was missing/
    );
  });
});
