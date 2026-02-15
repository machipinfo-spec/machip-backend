Backend

DB - Firebase
https://console.firebase.google.com/u/0/project/tetra-42213/firestore?hl=ja

AWS

- 認証: Cognito
  https://ap-northeast-1.console.aws.amazon.com/cognito/v2/idp/user-pools?region=ap-northeast-1
- ApiManagement + Lambda
  poc: https://ap-northeast-1.console.aws.amazon.com/apigateway/main/apis/gn8lp51l0h/resources?api=gn8lp51l0h&region=ap-northeast-1&url=https%3A%2F%2Fap-northeast-1.console.aws.amazon.com%2Fapigateway%2Fhome%3Fregion%3Dap-northeast-1%23%2Fapis%2Fgn8lp51l0h%2Fresources

- シークレット保存先
  https://ap-northeast-1.console.aws.amazon.com/systems-manager/parameters/?region=ap-northeast-1&tab=Table

テスト方法
idToken取得

# id-token取得

aws cognito-idp admin-initiate-auth `  --user-pool-id ap-northeast-1_PiUJvDsyB`
--client-id 1n36isqce58tjfb545ild5ijr0 `  --auth-flow ADMIN_NO_SRP_AUTH`
--auth-parameters USERNAME=mosamosa1228@gmail.com,PASSWORD=.Sugi1228 `
--region ap-northeast-1

取得したidTokenをAuthorizeヘッダに設定する

パッケージアップデート方法
npx npm-check-updates -u
npm install
