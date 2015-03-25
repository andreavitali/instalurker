# InstaLurker
Another Node+Angular playground project.
Search and surf public instagram photos, manage a list of followed profiles independently from your Instagram account, in a full responsive web app!

Requires an instagram developer account! Create one [here](https://instagram.com/developer)!

### Installation
You need Grunt installed globally:
```sh
$ npm install -g grunt
$ npm install -g grunt-cli
```

Then execute these steps:

1. Replace data in file *config/config.js* with your own configurations.
2. Set ENV constant in grunt (row 27 of grunfile.js) equals to the Redirect URI of your [instagram client](https://instagram.com/developer/clients/manage/).
2. Execute
```sh
$ npm install
$ grunt
```

### Technologies
This project uses a number of open source projects to work properly:

* Node.js + Express for the backend
* AngularJS + Foundation Framework (SASS) for the frontend
* [Angular Foundation](http://pineconellc.github.io/angular-foundation/#/typeahead) for typeahead and modal directives
* [Satellizer](https://github.com/sahat/satellizer) for OAuth 2.0 authentication in Angular
* [angular-linkify](https://github.com/scottcorgan/angular-linkify) slightly modified to parse instagram users link
* Grunt for build tasks
* [instagram-node-lib](https://github.com/mckelvey/instagram-node-lib) as Instagram API proxy for Node
* Mongoose to read/write MongoDB database
* Favicon taken from "Shift" set by [Tahsin Tahil](https://www.iconfinder.com/tahsintahil)

### License
MIT
