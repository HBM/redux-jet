/* globals describe it before */
import assert from 'assert'
import { connect } from '../lib/actions'
import { Daemon, Peer } from 'node-jet'

describe('actions', () => {
  let daemon
  let peer
  before(() => {
    daemon = new Daemon()
    daemon.listen()

    peer = new Peer()
    return peer.connect()
  })

  it('connect', (done) => {
    let i = 0
    connect({url: 'ws://localhost:11123'})((action) => {
      if (i === 0) {
        assert.deepEqual(action, {
          type: 'JET_CONNECT_REQUEST',
          url: 'ws://localhost:11123',
          password: undefined,
          user: undefined
        })
        ++i
      } else {
        console.log(action)
        done()
      }
    })
  })
})
