#!/usr/bin/env python3
"""
send_support_message.py

Tiny CLI to post an admin/bot message to the SkyPlan support endpoint.

Usage examples:
  python send_support_message.py --text "Hello from admin"
  python send_support_message.py --text "Hi" --host http://localhost:5000 --sender bot
  python send_support_message.py --text "Reply" --token <JWT>

This script uses only the Python standard library so no extra dependencies are required.
"""

import argparse
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from time import time


def main():
    p = argparse.ArgumentParser(description='Send admin support message to SkyPlan')
    p.add_argument('--text', '-t', required=True, help='Message text to send')
    p.add_argument('--host', '-H', default='http://localhost:5000', help='Base host (default: http://localhost:5000)')
    p.add_argument('--sender', '-s', default='bot', help="Sender id (default: 'bot')")
    p.add_argument('--ts', type=int, help='Timestamp in ms (optional). If omitted server will set it.')
    p.add_argument('--token', help='Optional bearer token to include in Authorization header')
    p.add_argument('--dry-run', action='store_true', help='Print payload but do not send')
    args = p.parse_args()


    payload = {
        'text': args.text,
        'sender': args.sender,
    }
    # Chỉ gửi ts nếu user truyền --ts, còn lại để server tự sinh
    if args.ts:
        payload['ts'] = int(args.ts)

    url = args.host.rstrip('/') + '/api/support/message'
    data = json.dumps(payload).encode('utf-8')

    print('POST ->', url)
    print('Payload:', json.dumps(payload, ensure_ascii=False))

    if args.dry_run:
        print('Dry run mode, not sending')
        return 0

    req = Request(url, data=data, headers={'Content-Type': 'application/json'})
    if args.token:
        req.add_header('Authorization', f'Bearer {args.token}')

    try:
        resp = urlopen(req, timeout=10)
        resp_body = resp.read().decode('utf-8')
        print('Server response:', resp.getcode(), resp_body)
        return 0
    except HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ''
        print('HTTP Error:', e.code, e.reason)
        if body:
            print('Body:', body)
        return 2
    except URLError as e:
        print('URL Error:', e.reason)
        return 3
    except Exception as e:
        print('Unexpected error:', e)
        return 4


if __name__ == '__main__':
    sys.exit(main())
