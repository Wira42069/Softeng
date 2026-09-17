open in vsc

go to terminal and type:
npm run dev

then install ThunderClient extension
New Request

## 1. Posting a new draft
POST http://localhost:3000/api/drafts
JSON content:
{
  "email":"Tester@test.com",
  "password":"password123",
  "name":"Test User 2"
}

you should get something like status: 200 OK
{
  "id": "cmp512pg30007cbfwevlpejai",
  "title": "Untitled Draft",
  "content": {
    "type": "doc",
    "content": []
  },
  "userId": "6VGJ41zOrfcEUke59ydQQSfNg2Ds4JAu",
  "createdAt": "2026-05-14T05:08:25.300Z",
  "updatedAt": "2026-05-14T05:08:25.300Z"
}


## 2. returning all drafts
GET http://localhost:3000/api/drafts
returns something like this
[
  {
    "id": "cmp512pg30007cbfwevlpejai",
    "title": "Untitled Draft",
    "updatedAt": "2026-05-14T05:08:25.300Z",
    "createdAt": "2026-05-14T05:08:25.300Z"
  },
  {
    "id": "cmp50alxl0001cbfwisco6g84",
    "title": "Untitled Draft",
    "updatedAt": "2026-05-14T04:51:56.154Z",
    "createdAt": "2026-05-14T04:46:34.376Z"
  },
  {
    "id": "cmp50ansc0003cbfwyke4pp2j",
    "title": "Untitled Draft",
    "updatedAt": "2026-05-14T04:46:36.780Z",
    "createdAt": "2026-05-14T04:46:36.780Z"
  }
]




## 3. returning specific single draft (copy the id)
GET http://localhost:3000/api/drafts/cmp50alxl0001cbfwisco6g84
returns
{
  "id": "cmp50alxl0001cbfwisco6g84",
  "title": "Untitled Draft",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "text": "Hello world",
            "type": "text"
          }
        ]
      }
    ]
  },
  "userId": "6VGJ41zOrfcEUke59ydQQSfNg2Ds4JAu",
  "createdAt": "2026-05-14T04:46:34.376Z",
  "updatedAt": "2026-05-14T04:51:56.154Z",
  "versions": [
    {
      "id": "cmp50hi830005cbfwvtlkat4n",
      "draftId": "cmp50alxl0001cbfwisco6g84",
      "content": {
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "text": "Hello world",
                "type": "text"
              }
            ]
          }
        ]
      },
      "createdAt": "2026-05-14T04:51:56.160Z"
    }
  ]
}







## 4. testing Autosaving
PUT http://localhost:3000/api/drafts/cmp50alxl0001cbfwisco6g84
put this in JSON
{
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Hello world"
          }
        ]
      }
    ]
  }
}

should return smth like this
{
  "draft": {
    "id": "cmp50alxl0001cbfwisco6g84",
    "title": "Untitled Draft",
    "content": {
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "text": "Hello world",
              "type": "text"
            }
          ]
        }
      ]
    },
    "userId": "6VGJ41zOrfcEUke59ydQQSfNg2Ds4JAu",
    "createdAt": "2026-05-14T04:46:34.376Z",
    "updatedAt": "2026-05-14T05:14:20.663Z"
  },
  "version": {
    "id": "cmp51abnj0009cbfw3bkq2tgm",
    "draftId": "cmp50alxl0001cbfwisco6g84",
    "content": {
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "text": "Hello world",
              "type": "text"
            }
          ]
        }
      ]
    },
    "createdAt": "2026-05-14T05:14:20.668Z"
  }
}




## 5. returns a single draft's all versions
GET http://localhost:3000/api/drafts/cmp50alxl0001cbfwisco6g84/versions
returns 
[
  {
    "id": "cmp51abnj0009cbfw3bkq2tgm",
    "createdAt": "2026-05-14T05:14:20.668Z"
  },
  {
    "id": "cmp50hi830005cbfwvtlkat4n",
    "createdAt": "2026-05-14T04:51:56.160Z"
  }
]

