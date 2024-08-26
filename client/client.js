/*
	小张聊天室开发组：
	MrZhang365：领导者，主要编写JS、NodeJS。
	paperee：成员，主要编写HTML、CSS、JS。

	另外，感谢提供参考代码的4n0n4me和Dr0。
*/

// 在/上选择chatinput
document.addEventListener("keydown", e => {
	if (e.key === '/' && document.getElementById("chatinput") != document.activeElement) {
		e.preventDefault();
		document.getElementById("chatinput").focus();
	}
});

// 初始化Markdown
var markdownOptions = {
	html: false,
	xhtmlOut: false,
	breaks: true,
	langPrefix: '',
	linkify: true,
	linkTarget: '_blank" rel="noreferrer',
	typographer: true,
	quotes: `""''`,
	doHighlight: true,
	langPrefix: 'hljs language-',
	highlight: function (str, lang) {
		if (!markdownOptions.doHighlight || !window.hljs) {
			return '';
		}

		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(lang, str).value;
			} catch (__) {
				// nothing
			}
		}

		try {
			return hljs.highlightAuto(str).value;
		} catch (__) {
			// nothing
		}

		return '';
	}
};

var md = new Remarkable('full', markdownOptions);

// 允许渲染的图片域名
var allowImages = true;
var imgHostWhitelist = [];

function getDomain(link) {
	var a = document.createElement('a');
	a.href = link;
	return a.hostname;
}

function isWhiteListed(link) {
	return imgHostWhitelist.indexOf(getDomain(link)) !== -1;
}

var allowAudio = true;    // 允许音频


function isAudioFile(filename) {
    var audioRegex = /\.(mp3|wav|ogg|mp4|flac|m4a|aac)$/i;
    return audioRegex.test(filename);
}

md.renderer.rules.image = function (tokens, idx, options) {
    var src = Remarkable.utils.escapeHtml(tokens[idx].src);

    if (isWhiteListed(src) && allowImages) {
        var imgSrc = ` src="${Remarkable.utils.escapeHtml(tokens[idx].src)}"`;
        var title = tokens[idx].title ? (` title="${Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(tokens[idx].title))}"`) : '';
        var alt = ` alt="${(tokens[idx].alt ? Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(Remarkable.utils.unescapeMd(tokens[idx].alt))) : '')}"`;
        var suffix = options.xhtmlOut ? ' /' : '';
        var scrollOnload = isAtBottom() ? ' onload="window.scrollTo(0, document.body.scrollHeight)"' : '';
        return `<a href="${src}" target="_blank" rel="noreferrer"><img${scrollOnload}${imgSrc}${alt}${title}${suffix} class="text"></a>`;
    } else if (isAudioFile(src) && allowAudio) {
        var audioSrc = ` src="${Remarkable.utils.escapeHtml(tokens[idx].src)}"`;
        var title = tokens[idx].title ? (` title="${Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(tokens[idx].title))}"`) : '';
        var alt = ` alt="${(tokens[idx].alt ? Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(Remarkable.utils.unescapeMd(tokens[idx].alt))) : '')}"`;
        var suffix = options.xhtmlOut ? ' /' : '';
        var scrollOnload = isAtBottom() ? ' onload="window.scrollTo(0, document.body.scrollHeight)"' : '';
        return `<a href="${src}" target="_blank" rel="noreferrer"><audio ${scrollOnload}${audioSrc}${alt}${title}${suffix} controls></audio></a>`;
    }

    return `<a href="${src}" target="_blank" rel="noreferrer">${Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(src))}</a>`;
};

md.renderer.rules.link_open = function (tokens, idx, options) {
	var title = tokens[idx].title ? (` title="${Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(tokens[idx].title))}"`) : '';
	var target = options.linkTarget ? (` target="${options.linkTarget}"`) : '';
	return `<a rel="noreferrer" onclick="return verifyLink(this)" href="${Remarkable.utils.escapeHtml(tokens[idx].href)}"${title}${target}>`;
};

md.renderer.rules.text = function(tokens, idx) {
	tokens[idx].content = Remarkable.utils.escapeHtml(tokens[idx].content);

	if (tokens[idx].content.indexOf('?') !== -1) {
		tokens[idx].content = tokens[idx].content.replace(/(^|\s)(\?)\S+?(?=[,.!?:)]?\s|$)/gm, function(match) {
			var channelLink = Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(match.trim()));
			var whiteSpace = '';

			if (match[0] !== '?') {
				whiteSpace = match[0];
			}

			return `${whiteSpace}<a href="${channelLink}" target="_blank">${channelLink}</a>`;
		});
	}

	return tokens[idx].content;
};

md.use(remarkableKatex);

function verifyLink(link) {
	var linkHref = Remarkable.utils.escapeHtml(Remarkable.utils.replaceEntities(link.href));

	if (linkHref !== link.innerHTML) {
		return confirm(`等一下！你即将前往：${linkHref}`);
	}

	return true;
}

var verifyNickname = function (nick) {
	return /^[\u4e00-\u9fa5_a-zA-Z0-9]{1,24}$/.test(nick);
}

function getHome() {
	return new Promise((res, rej) => {
		const client = new WebSocket(getWsAddress())
		client.onerror = () => rej('Failed to connect to server')
		client.onmessage = message => {
			const payload = JSON.parse(message.data)

			if (payload.cmd === 'home') {
				res(payload)
				client.close()
			} else {
				rej('Not home command')
			}
		}
		client.onclose = () => {
			rej('Connection closed')
		}
		client.onopen = () => client.send(JSON.stringify({
			cmd: 'home'
		}))
	})
}

function buildHome() {
	getHome().then(data => {
		const frontpage = [
			'# 在线匿名聊天室',
			'---',
			'欢迎来到匿名聊天室，这是一个黑客风格的聊天室。',
			'注意：在这里，我们把"房间（chatroom）"称作"频道（channel）"。',
			`当前在线用户数量：${data.users}`,
			'主频道（在线用户多）： ?chat',
			`其他公开频道： ${data.channels.map(c => `?${c}`).join(' ')}`,
			`您也可以自己创建频道，只需要按照这个格式打开网址即可：${document.URL}?房间名称`,
			`这个是为您准备的频道（只有您自己）： ?${Math.random().toString(36).substr(2, 8)}`
		].join("\n");
		pushMessage({
			text: frontpage,
		})
	})
	.catch((reason) => {
		console.error(reason)
		pushMessage({
			nick: '!',
			text: '# 出错了！\n无法连接服务器，这可能是您的网络问题，或者服务器崩溃。\n请稍后再试。'
		})
	})
}

function $(query) {
	return document.querySelector(query);
}

function localStorageGet(key) {
	try {
		return window.localStorage[key]
	} catch (e) {
		// nothing
	}
}

function localStorageSet(key, val) {
	try {
		window.localStorage[key] = val
	} catch (e) {
		// nothing
	}
}

var ws;
var myNick = localStorageGet('my-nick') || '';
var myChannel = decodeURI(window.location.search.replace(/^\?/, ''));
var lastSent = [""];
var lastSentPos = 0;
var messageIds = {}
var modCmd = null
var topics = []
var topicMessages = {}
var currentTopic = '---'
var incrementId = 0

/** 通知和本地存储 **/
var notifySwitch = document.getElementById("notify-switch")
var notifySetting = localStorageGet("notify-api")
var notifyPermissionExplained = 0; // 1 = 显示已授予的消息，-1 = 显示拒绝的消息

// 初始通知请求权限
function RequestNotifyPermission() {
	try {
		var notifyPromise = Notification.requestPermission();

		if (notifyPromise) {
			notifyPromise.then(function (result) {
				console.log(`ZhangChat桌面通知权限：${result}`);

				if (result === "granted") {
					if (notifyPermissionExplained === 0) {
						pushMessage({cmd: "chat", nick: "*", text: "已获得桌面通知权限", time: null});
						notifyPermissionExplained = 1;
					}
					return false;
				} else {
					if (notifyPermissionExplained === 0) {
						pushMessage({cmd: "chat", nick: "!", text: "桌面通知权限被拒绝，当有人@你时，你将不会收到桌面通知", time: null});
						notifyPermissionExplained = -1;
					}
					return true;
				}
			});
		}
	} catch (error) {
		pushMessage({cmd: "chat", nick: "!", text: "无法创建桌面通知", time: null});
		console.error("无法创建桌面通知，该浏览器可能不支持桌面通知，错误信息：\n")
		console.error(error)
		return false;
	}
}

// 更新本地储存的复选框值
notifySwitch.addEventListener('change', (event) => {
	if (event.target.checked) {
		RequestNotifyPermission();
	}

	localStorageSet("notify-api", notifySwitch.checked)
})

// 检查是否设置了本地存储，默认为OFF
if (notifySetting === null) {
	localStorageSet("notify-api", "false")
	notifySwitch.checked = false
}

// 配置通知开关复选框元素
if (notifySetting === "true" || notifySetting === true) {
	notifySwitch.checked = true
} else if (notifySetting === "false" || notifySetting === false) {
	notifySwitch.checked = false
}

/** 提示音和本地存储 **/
var soundSwitch = document.getElementById("sound-switch")
var notifySetting = localStorageGet("notify-sound")

// 更新本地储存的复选框值
soundSwitch.addEventListener('change', (event) => {
	localStorageSet("notify-sound", soundSwitch.checked)
})

// 检查是否设置了本地存储，默认为OFF
if (notifySetting === null) {
	localStorageSet("notify-sound", "false")
	soundSwitch.checked = false
}

// 配置声音开关复选框元素
if (notifySetting === "true" || notifySetting === true) {
	soundSwitch.checked = true
} else if (notifySetting === "false" || notifySetting === false) {
	soundSwitch.checked = false
}

// 在检查是否已授予权限后创建新通知
function spawnNotification(title, body) {
	if (!("Notification" in window)) {
		console.error("浏览器不支持桌面通知");
	} else if (Notification.permission === "granted" || (Notification.permission !== "denied" && RequestNotifyPermission())) { // 检查是否已授予通知权限
		var options = {body: body, icon: "/favicon.ico"};
		var n = new Notification(title, options);
	}
}

function notify(args) {
	// 生成通知（如果已启用）
	if (notifySwitch.checked) {
		spawnNotification(`?${myChannel} - ${args.nick}`, args.text)
	}

	// 播放声音（如果已启用）
	if (soundSwitch.checked) {
		var soundPromise = document.getElementById("notify-sound").play();

		if (soundPromise) {
			soundPromise.catch(function (error) {
				console.error(`播放提示音错误：${error}`);
			});
		}
	}
}

function getNick() {
	return myNick.split('#')[0]
}

function getWsAddress() {
	/*
		如果在服务器配置期间更改了端口，请更改wsPath端口（例如：':8080'）
		如果是反向代理，请将wsPath更改为新ws地址（例如：'/chat-ws'）
	*/
	var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
	var wsPath = ':6060';

	、
	const url = ( document.domain === 'sb.cnm.wn.sm.jb' ) ? localStorageGet('connect-address') || 'wss://chat.redble.top/ws' : `${protocol}//${document.domain}${wsPath}`
	return url
}

function join(channel) {
	ws = new WebSocket(getWsAddress());
	
	var wasConnected = false;

	ws.onopen = async function () {
		var shouldConnect = true;

		if (!wasConnected) {
			if (location.hash) {
				myNick = location.hash.substr(1);
			} else {
				var newNick = localStorageGet('my-nick') || ''; if 
				(localStorageGet('auto-login') != 'true' || newNick 
				== undefined) newNick = prompt('请输入昵称：', 
				myNick);

				if (newNick !== null) {
					myNick = newNick;
				} else { // 用户以某种方式取消了提示
					shouldConnect = false;
				}
			}
		}

		if (myNick && shouldConnect) {
			localStorageSet('my-nick', myNick);
			//await getMurmur();
			// console.log(`murmur is: ${myMurmur}`)
			//var sendMurmur = encode(myMurmur)
			window.joinPayload = { cmd: 'join', channel: channel, nick: myNick, client: 'ZhangChatClient'}
			send(window.joinPayload);
		}

		wasConnected = true;
	}

	ws.onclose = function () {
		if (wasConnected) {
			pushMessage({nick: '!', text: "哎呀，掉线了，正在重新连接..."});
		}

		window.setTimeout(function () {
			join(channel);
		}, 1800);
		
	}

	ws.onmessage = function (message) {
		var args = JSON.parse(message.data);
		var cmd = args.cmd;
		var command = COMMANDS[cmd];
		// console.log(args)
		command.call(null, args);
	}
}

var COMMANDS = {
	chat: function (args) {
		if (ignoredUsers.indexOf(args.nick) >= 0) {
			return;
		}

		if (args.topic && !topics.includes(args.topic)) { topics.push(args.topic); topicMessages[args.topic] = []; addTopic(args.topic) }
		pushMessage(args);
	},

	info: function (args) {
		args.nick = '*';
		pushMessage(args);
	},

	warn: function (args) {
		args.nick = '!';
		pushMessage(args);
	},

	onlineSet: function (args) {
		var users = args.users;
		usersClear();

		users.forEach(function (user) {
			userAdd(user.nick, user.trip);
		});

		pushMessage({nick: '*', text: `在线用户：${args.nicks.join(", ")}`})

		if (localStorageGet('fun-system') != 'false'){
			pushWelcomeButton("打个招呼")
		}
	},

	onlineAdd: function (args) {
		var nick = args.nick;
		userAdd(nick,args.trip);

		if ($('#joined-left').checked) {
			if (localStorageGet('fun-system') == 'false') {
				var joinNotice = `${nick} 加入了聊天室`
			} else {
				const test = ['活蹦乱跳','可爱','美丽','快乐','活泼','美味', '野生']
				const test2 = ["误入","闯入","跳进","飞进","滚进","掉进", '跑进']
				var joinNotice = `${test[Math.round(Math.random()*(test.length - 1))]}的 ${nick} ${test2[Math.round(Math.random()*(test2.length - 1))]}了聊天室`
			}

			joinNotice += args.ip ? `\nIP地址：${args.ip}` : ''
			joinNotice += args.client ? `\nTA正在使用 ${args.client}` : ''
			joinNotice += args.auth ? `\n系统认证：${args.auth}` : ''

			pushMessage({nick: '→', text: joinNotice, trip: args.trip || ''}, 'info'); // 仿Discord

			if (localStorageGet('fun-system') != 'false') {
				pushWelcomeButton("欢迎一下")
			}
		}
	},

	onlineRemove: function (args) {
		var nick = args.nick;
		userRemove(nick);

		if ($('#joined-left').checked) {
			if (localStorageGet('fun-system') == 'false') {
				var leaveNotice = `${nick} 离开了聊天室`
			} else {
				const test = ["跳出","飞出","滚出","掉出","扭出","瞬移出"]
				var leaveNotice = `${nick} ${test[Math.round(Math.random()*(test.length - 1))]}了聊天室`
			}

			pushMessage({nick: '←', text: leaveNotice}, 'info'); //仿Discord
		}
	},

	'set-video': function (args) {
		pushMessage({nick: '*', text: `<video width="100%" controls><source src="${encodeURI(args.url)}"></video>`}, "info", true)
	},

	history: function (args) {
		var i = 0;

		for (i in args.history) {
			pushMessage(args.history[i], 'history');
		}

		pushMessage({nick: '*', text: '—— 以上是历史记录 ——'})
		if (window.showOnlineUsers) {
			window.showOnlineUsers = false
			pushMessage({nick: '*', text: `在线用户：${window.onlineUsers.join(", ")}`})
		}
	},

	changeNick: function (args) {
		userChange(args.nick, args.text);
		pushMessage({nick: '*', text: `${args.nick} 更名为 ${args.text}`})
	},

	html: args => {
		if (localStorageGet('allow-html') !== 'true') {
			return pushMessage({
				nick: '*',
				text: `您收到了一条来自 ${args.nick} 的 HTML信息，但是由于您不允许显示HTML信息，因此我们屏蔽了它`,
			})
		}

		pushMessage(args, undefined, true)
	},
	captcha: args => {
		// 显示验证码
		pushMessage({
			nick: '*',
			text: '当前频道认为你不是人，所以请先完成下面的人机验证：'
		})
		pushCaptcha(args.sitekey)
	},
	delmsg: args => {
		if (!messageIds[args.id]) return
		const nick = messageIds[args.id].nick
		const text = messageIds[args.id].text

		nick.textContent = '[已撤回]' + nick.textContent
		nick.oncontextmenu = e => e.preventDefault()
		text.innerHTML = '该信息已被撤回。如果此功能被滥用，请立刻报告管理员。'
	},
	banclient: args => {
		// 封禁当前客户端以“自杀”
		localStorageSet('client-banned', true)
		location.reload()    // 重载，开启震撼时代
	},
}

function checkClientBanned() {
	
}

function buildReplyText(user, text) {
	var replyText = `>`
	var tooLong = true
	const textList = text.split('\n')

	if (user.trip) {
		replyText += `[${user.trip}] ${user.nick}：\n`
	} else {
		replyText += `${user.nick}：\n`
	}

	for (var i = 0; i < 8; i+=1) {
		if (typeof textList[i] === 'undefined'){
			tooLong = false
			break
		}

		replyText += `>${textList[i]}\n`
	}

	if (i < textList.length && tooLong) {
		replyText += '>……\n\n'
	} else {
		replyText += '\n'
	}

	if (user.nick !== getNick()) {
		replyText += `@${user.nick} `
	}

	return replyText
}

function captchaCallback(token) {
	// 验证码回调函数
	$('#captcha').remove()    // 删除验证码元素，防止后面验证码自动重置导致页面自动滚动（新XChat开发时的经验）
	pushMessage({
		nick: '*',
		text: '已确认你是人，正在加入频道，请稍等片刻...'
	})
	if (!window.joinPayload) return pushMessage({
		nick: '!',
		text: '发生未知错误：找不到存档的join包\n请尝试刷新网页，如果此问题重复出现，请联系~~大傻逼~~开发者'
	})
	window.joinPayload.captcha = token    // 追加验证码token
	send(window.joinPayload)
}

function pushCaptcha(sitekey){
	// Message container
	var messageEl = document.createElement('div');
	messageEl.id = 'captcha'

	messageEl.classList.add('message');
	messageEl.classList.add('info');

	// Nickname
	var nickSpanEl = document.createElement('span');
	nickSpanEl.classList.add('nick');
	messageEl.appendChild(nickSpanEl);

	var nickLinkEl = document.createElement('a');
	nickLinkEl.textContent = '#';

	var date = new Date(Date.now());
	nickLinkEl.title = date.toLocaleString();
	nickSpanEl.appendChild(nickLinkEl);

	turnstile.render(messageEl, {
		sitekey,
		callback: captchaCallback,
		theme: 'dark',
		language: 'zh-cn',
	})

	// Scroll to bottom
	var atBottom = isAtBottom();
	$('#messages').appendChild(messageEl);
	if (atBottom && myChannel) {
		window.scrollTo(0, document.body.scrollHeight);
	}

	unread += 1;
	updateTitle();
}

function pushMessage(args, cls = undefined, html = false) { // cls指定messageEl添加什么classList
	// 消息容器
	var messageEl = document.createElement('div');
	
	if (args.messageID){
		messageEl.id = args.messageID
	}

	if (
		typeof (myNick) === 'string' && (
			args.text.match(new RegExp(`@${getNick()}\\b`, "gi")) ||
			((args.type === "whisper" || args.type === "invite") && args.from)
		)
	) {
		notify(args);
	}

	messageEl.classList.add('message');

	if (typeof cls === 'string') {
		messageEl.classList.add(cls);
	} else if (cls !== null) {
		if (verifyNickname(getNick()) && args.nick == getNick()) {
			messageEl.classList.add('me');
		} else if (args.nick == '!') {
			messageEl.classList.add('warn');
		} else if (args.nick == '*') {
			messageEl.classList.add('info');
		}
	}
	
	// 昵称
	var nickSpanEl = document.createElement('span');
	nickSpanEl.classList.add('nick');
	messageEl.appendChild(nickSpanEl);

	if (args.trip) {
		var tripEl = document.createElement('span');
		var uwuTemp

		
		if (!cls) {
			var prefixs = []
			var prefixs2 = []

			if (args.isBot) { // 机器人标识
				prefixs.push(String.fromCodePoint(10022)) 
				prefixs2.push("Bot")
			}

			if (args.admin) { // 站长标识
				prefixs.push(String.fromCodePoint(9770))
				prefixs2.push("Admin")
			} else if (args.mod) { // 管理员标识
				prefixs.push(String.fromCodePoint(9733))
				prefixs2.push("Mod")
			} else if (args.channelOwner) { // 房主标识
				prefixs.push(String.fromCodePoint(10033))
				prefixs2.push("RoomOP") // 再缩缩（
			} else if (args.trusted) { // 信任用户标识
				prefixs.push(String.fromCodePoint(9830))
			}

			var strPrefixs = prefixs2.join('&');

			if (strPrefixs || args.trusted) { // 虽然直接插入HTML，但这是在本地运行的JS代码，根本没法做到XSS（
				strPrefixs = `√${strPrefixs}`;
				uwuTemp = `<span class="none onlyemoji">${prefixs.join(" ")}</span><span class="none onlytext">${strPrefixs}</span>`
			}
		}

		tripEl.innerHTML = `${uwuTemp || ''}<span class="uwuTrip">${args.trip}</span>`;
		tripEl.classList.add('trip');

		if (!cls) {
			let temp = localStorageGet('prefix');
			display('none', 'none', tripEl);

			if (temp && temp != 'none') {
				display(temp, 'inline', tripEl);
			}
		}

		nickSpanEl.appendChild(tripEl);
	}

	if (args.head) {
		// 头像
		var imgEl = document.createElement('img');
		imgEl.src = args.head;
		imgEl.className = 'uwuTest';

		if (localStorageGet('show-head') == 'false') {
			imgEl.style.display = "none";
		}

		nickSpanEl.appendChild(imgEl);
	}

	if (args.nick) {
		var nickLinkEl = document.createElement('a');
		nickLinkEl.textContent = args.nick;

		var date = new Date(args.time || Date.now());
		nickLinkEl.title = date.toLocaleString();

		if (args.color && /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(args.color)) {
			nickLinkEl.setAttribute('style', `color:#${args.color}!important`);
			nickLinkEl.title += ` #${args.color}`;
		}

		nickLinkEl.onclick = function() {
			insertAtCursor(`@${args.nick} `);
			$('#chatinput').focus();
		}

		nickLinkEl.oncontextmenu = function(e){
			if (html) {
				if (!window.showHtmlCode) return
				e.preventDefault();
				pushMessage({
					nick: '*',
					text: '```html\n' + args.text
				})
				return
			}
			e.preventDefault();
			var replyText = buildReplyText({nick:args.nick, trip: args.trip || ''}, args.text)
			replyText += $('#chatinput').value
			$('#chatinput').value = ''
			insertAtCursor(replyText)
			$('#chatinput').focus();
		}

		nickSpanEl.appendChild(nickLinkEl);
	}

	var textEl = document.createElement('p');

	// 文本
	if (!html) {
		textEl.innerHTML = md.render(args.text);
	} else {
		textEl = document.createElement('div');
		textEl.innerHTML = args.text;
	}

	textEl.classList.add('text');

	messageEl.appendChild(textEl)

	// 添加信息ID，方便撤回
	messageIds[args.id] = {
		nick: nickLinkEl,
		text: textEl,
	}
	messageEl.id = args.id

	if (args.topic) {
		topicMessages[args.topic].push(messageEl)
		if (currentTopic !== '---') {
			if (args.topic !== currentTopic) { messageEl.style.display = 'none' }
			else messageEl.style.display = 'block'
		}
	}
	
	// Scroll to bottom
	var atBottom = isAtBottom();
	$('#messages').appendChild(messageEl);
	if (atBottom && myChannel) {
		window.scrollTo(0, document.body.scrollHeight);
	}

	unread += 1;
	updateTitle();
}

function pushWelcomeButton(text) {
	// 消息容器
	var messageEl = document.createElement('div');
	messageEl.classList.add('message');
	messageEl.classList.add('info');
	
	// 昵称
	var nickSpanEl = document.createElement('span');
	nickSpanEl.classList.add('nick');
	messageEl.appendChild(nickSpanEl);

	var nickLinkEl = document.createElement('a');
	nickLinkEl.textContent = '*';

	nickLinkEl.onclick = function () {
		insertAtCursor("@* ");
		$('#chatinput').focus();
	}

	var date = new Date(Date.now());
	nickLinkEl.title = date.toLocaleString();
	nickSpanEl.appendChild(nickLinkEl);

	// 文本
	var textEl = document.createElement('div');
	textEl.classList.add('text');
	
	// 按钮
	var buttonEl = document.createElement('a')
	buttonEl.textContent = text

	buttonEl.onclick = () => {
		var hiyo = 'hi yo'
		var max = Math.round(Math.random()*20)

		for (var i = 0; i < max; i++) { // @ee 你想累死我啊
			hiyo += 'o' // ee：（被打
		}

		const welcomes = [hiyo, 'awa!', 'uwu!', '来了老弟~', '来了老妹~', '来了牢弟~']
		var txt = welcomes[Math.round(Math.random()*(welcomes.length - 1))]
		send({cmd: 'chat', text: txt, head: localStorageGet('head') || ''})
	}

	textEl.appendChild(buttonEl)
	messageEl.appendChild(textEl);
	$('#messages').appendChild(messageEl);
	autoBottom(false)
}

function autoBottom(add = true) {
	// 滚动到底部
	if (isAtBottom() && !!myChannel) {
		window.scrollTo(0, document.body.scrollHeight);
	}

	if (add) unread += 1;
	updateTitle();
}

function insertAtCursor(text) {
	var input = $('#chatinput');
	var start = input.selectionStart || 0;
	var before = input.value.substr(0, start);
	var after = input.value.substr(start);

	before += text;
	input.value = before + after;
	input.selectionStart = input.selectionEnd = before.length;

	updateInputSize();
}

function send(data) {
	if (ws && ws.readyState === ws.OPEN) {
		if ($('#rainbow-nick').checked && data['cmd'] == 'chat') {
			ws.send(JSON.stringify({cmd: 'changecolor', color: `#${Math.floor(Math.random()*0xffffff).toString(16).padEnd(6,"0")}`}));
		};

		ws.send(JSON.stringify(data));
	}
}

var windowActive = true;
var unread = 0;

window.onfocus = function () {
	windowActive = true;
	updateTitle();
}

window.onblur = function () {
	windowActive = false;
}

window.onscroll = function () {
	if (isAtBottom()) {
		updateTitle();
	}
}

function isAtBottom() {
	return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 1);
}

var uwuTitle = "小张聊天室";
var uwuBUG = "ZhangChat"

function updateTitle() {
	if (windowActive && isAtBottom()) {
		unread = 0;
	}

	if (myChannel) {
		uwuTitle = myChannel;

		if (unread > 0) {
			uwuTitle = `（${unread}）${uwuTitle}`;
		}
	}

	document.title = `${uwuTitle} - ${uwuBUG}`;
}

document.addEventListener('visibilitychange', function() {
	if (document.visibilityState == 'hidden') {
		uwuBUG = 'ZhangBUG';
	} else {
		uwuBUG = 'ZhangChat';
	}

	document.title = `${uwuTitle} - ${uwuBUG}`;
});

$('#footer').onclick = function () {
	$('#chatinput').focus();
}

$('#chatinput').onkeydown = function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		// 发送消息
		if (!!e.target.value) {
			var text = e.target.value;
			e.target.value = '';

			send({cmd: 'chat', text: text, head: localStorageGet('head') || '', topic: currentTopic === '---' ? undefined : currentTopic});

			lastSent[0] = text;
			lastSent.unshift("");
			lastSentPos = 0;

			updateInputSize();
		}
	} else if (e.keyCode == 38 /* UP */) {
		// 恢复以前发送的消息
		if (e.target.selectionStart === 0 && lastSentPos < lastSent.length - 1) {
			e.preventDefault();

			if (lastSentPos == 0) {
				lastSent[0] = e.target.value;
			}

			lastSentPos += 1;
			e.target.value = lastSent[lastSentPos];
			e.target.selectionStart = e.target.selectionEnd = e.target.value.length;

			updateInputSize();
		}
	} else if (e.keyCode == 40 /* DOWN */) {
		if (e.target.selectionStart === e.target.value.length && lastSentPos > 0) {
			e.preventDefault();

			lastSentPos -= 1;
			e.target.value = lastSent[lastSentPos];
			e.target.selectionStart = e.target.selectionEnd = 0;

			updateInputSize();
		}
	} else if (e.keyCode == 27 /* ESC */) {
		// 清空输入框
		e.preventDefault();
		e.target.value = '';
		lastSentPos = 0;
		lastSent[lastSentPos] = '';
		updateInputSize();
	} else if (e.keyCode == 9 /* TAB */) {
		if (e.ctrlKey) {
			return;
		}

		e.preventDefault();

		var pos = e.target.selectionStart || 0;
		var text = e.target.value;
		var index = text.lastIndexOf('@', pos);

		var autocompletedNick = false;

		if (index >= 0) {
			var stub = text.substring(index + 1, pos);

			// 搜索昵称
			var nicks = onlineUsers.filter(function (nick) {
				return nick.indexOf(stub) == 0
			});

			if (nicks.length > 0) {
				autocompletedNick = true;

				if (nicks.length == 1) {
					insertAtCursor(nicks[0].substr(stub.length) + " ");
				}
			}
		}

		// 由于没有插入昵称，因此插入一个制表符
		if (!autocompletedNick) {
			insertAtCursor('\t');
		}
	}
}

function updateInputSize() {
	var atBottom = isAtBottom();

	var input = $('#chatinput');
	input.style.height = 0;
	input.style.height = input.scrollHeight + 'px';
	document.body.style.marginBottom = $('#footer').offsetHeight + 'px';

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}
}

$('#chatinput').oninput = function () {
	updateInputSize();
}

updateInputSize();

/* 侧边栏 */

$('#sidebar').onmouseenter = $('#sidebar').ontouchstart = function (e) {
	$('#sidebar-content').classList.remove('hidden');
	$('#sidebar').classList.add('expand');
	e.stopPropagation();
}

$('#sidebar').onmouseleave = document.ontouchstart = function (event) {
	var e = event.toElement || event.relatedTarget;

	try {
		if (e.parentNode == this || e == this) {
			return;
		}
	} catch (e) {
		return;
	}

	if (!$('#pin-sidebar').checked) {
		$('#sidebar-content').classList.add('hidden');
		$('#sidebar').classList.remove('expand');
	}
}

$('#set-video').onclick = function() {
	var newVideo = prompt('请输入视频文件地址（留空则清除公共视频）：', '')

	if (newVideo === null){
		return pushMessage({nick:'!', text:'您取消了设置视频'})
	}

	send({cmd:'set-video', url: newVideo || 'nothing'})
}

$('#get-video').onclick = function() {
	send({cmd:'get-video'})
}

$('#get-history').onclick = () => {
	window.showOnlineUsers = true
	pushMessage({
		nick: '*',
		text: '请稍等，正在获取历史记录...'
	})
	send({ cmd: 'get-history' })
}

$('#clear-messages').onclick = function () {
	// 清空聊天记录
	if (!confirm('是否清除本页聊天内容？')){ // 你确定吗？
		return
	}

	var messages = $('#messages');
	messages.innerHTML = '';
	pushMessage({nick:'*', text:'—— 历史记录为空 ——'})
}

$('#set-head').onclick = function () {
	var newHead = prompt('请输入头像地址（留空则使用默认值）：',localStorageGet('head') || '')
	localStorageSet('head', newHead || '')
}

$('#create-topic').onclick = () => {
	const userInput = prompt('请输入话题：')
	if (!userInput) return

	const topic = userInput.toLocaleLowerCase().trim()
	
	topics.push(topic);
	topicMessages[topic] = [];
	addTopic(topic)

	pushMessage({
		nick: '*',
		text: `已添加话题 ${topic}`
	})
}

// 从本地存储还原设置

$('#auto-login').checked = localStorageGet('auto-login') == 'true';

if (localStorageGet('pin-sidebar') == 'true') {
	$('#pin-sidebar').checked = true;
	$('#sidebar-content').classList.remove('hidden');
}

if (localStorageGet('fun-system') == 'false') {
	$('#fun-system').checked = false;
}

if (localStorageGet('joined-left') == 'false') {
	$('#joined-left').checked = false;

	if ($('#joined-left').checked) {
		$('#fun-system').removeAttribute('disabled')
	} else {
		$('#fun-system').setAttribute('disabled','disabled')
	}
}

if (localStorageGet('parse-latex') == 'false') {
	$('#parse-latex').checked = false;
	md.inline.ruler.disable([ 'katex' ]);
	md.block.ruler.disable([ 'katex' ]);
}

if (localStorageGet('rainbow-nick') == 'true') {
	$('#rainbow-nick').checked = true;
}

if (localStorageGet('allow-html') == 'false') {
	$('#allow-html').checked = false;
}

if (localStorageGet('show-head') == 'false') {
	$('#show-head').checked = false;
}

$('#pin-sidebar').onchange = function (e) {
	localStorageSet('pin-sidebar', !!e.target.checked);
}

$('#joined-left').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('joined-left', enabled);

	if (enabled) {
		$('#fun-system').removeAttribute('disabled')
	} else {
		$('#fun-system').setAttribute('disabled','disabled')
	}
}

$('#fun-system').onchange = function (e) {
	localStorageSet('fun-system', !!e.target.checked);
}

$('#allow-html').onchange = function (e) {
	localStorageSet('allow-html', !!e.target.checked);
}

$('#show-html-code').onchange = function (e) {
	
}

$('#parse-latex').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('parse-latex', enabled);

	if (enabled) {
		md.inline.ruler.enable([ 'katex' ]);
		md.block.ruler.enable([ 'katex' ]);
	} else {
		md.inline.ruler.disable([ 'katex' ]);
		md.block.ruler.disable([ 'katex' ]);
	}
}

if (localStorageGet('syntax-highlight') == 'false') {
	$('#syntax-highlight').checked = false;
	markdownOptions.doHighlight = false;
}

$('#syntax-highlight').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('syntax-highlight', enabled);
	markdownOptions.doHighlight = enabled;
}

if (localStorageGet('allow-imgur') == 'false') {
	$('#allow-imgur').checked = false;
	allowImages = false;
}

if (localStorageGet('allow-audio') == 'false') {
	$('#allow-audio').checked = false;
	allowAudio = false;
}

$('#auto-login').onchange = function (e) {
	localStorageSet('auto-login', !!e.target.checked);
}

$('#allow-imgur').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('allow-imgur', enabled);
	allowImages = enabled;
}

$('#allow-audio').onchange = function (e) {
	var enabled = !!e.target.checked;
	localStorageSet('allow-audio', enabled);
	allowAudio = enabled;
}

$('#rainbow-nick').onchange = function (e) {
	localStorageSet('rainbow-nick', !!e.target.checked);
}

$('#show-head').onchange = function (e) {
	var enabled = !!e.target.checked;
	var state = 'none'
	localStorageSet('show-head', enabled);

	if (enabled) {
		state = 'inline'
	}

	display('uwuTest', state)
}

$('#connect-address').value = localStorageGet('connect-address') || 'wss://chat.zhangsoft.link/ws'

$('#connect-address').onchange = e => {
	var address = e.target.value
	localStorageSet('connect-address', address)

	pushMessage({
		nick: '*',
		text: '你已修改连接线路，请刷新界面来应用修改\n请注意：修改连接线路可能会造成连接不稳定，如果您不了解它，请立刻更改回去。',
	})
}

$('#topic-selector').onchange = e => {
	currentTopic = decodeURI(e.target.value)

	for (let topic in topicMessages) {
		for (let msg of topicMessages[topic]) {
			if (topic === currentTopic || currentTopic === '---') {
				document.getElementById(msg.id).style.display = 'block'
			} else {
				document.getElementById(msg.id).style.display = 'none'
			}
		}
	}
}

function display(name, state = 'none', scope = document) {
	let uwuClass = scope.getElementsByClassName(name)
	
	for (var i=0; i < uwuClass.length; i++) {
		uwuClass[i].style.display = state;
	}
}

// 用户列表
var onlineUsers = [];
var ignoredUsers = [];


function userAdd(nick, trip) {
	var user = document.createElement('a');
	user.textContent = nick;

	user.onclick = function (e) {
		userInvite(nick)
	}

	user.oncontextmenu = function (e) {
		e.preventDefault();
		userModAction(nick)
	}

	var userLi = document.createElement('li');
	userLi.appendChild(user);

	if (trip) {
		var userTrip = document.createElement('span')
		userTrip.innerHTML = trip
		userTrip.classList.add('trip')
		userLi.appendChild(userTrip)
	}

	$('#users').appendChild(userLi);
	onlineUsers.push(nick);
}

function userRemove(nick) {
	var users = $('#users');
	var children = users.children;

	for (var i = 0; i < children.length; i++) {
		var user = children[i];

		if (user.firstChild.textContent == nick) {
			users.removeChild(user);
		}
	}

	var index = onlineUsers.indexOf(nick);

	if (index >= 0) {
		onlineUsers.splice(index, 1);
	}
}

function userChange(nick, text) {
	var users = $('#users');
	var children = users.children;

	for (var i = 0; i < children.length; i++) {
		var user = children[i];

		if (user.firstChild.textContent == nick) {
			user.firstChild.innerText = text
			user.firstChild.onclick = function (e) {
				userInvite(text)
			}
			user.firstChild.oncontextmenu = function (e) {
				e.preventDefault();
				userModAction(text)
			}
		}
	}

	var index = onlineUsers.indexOf(nick);

	if (index >= 0) {
		onlineUsers[index] = text;
	}
}

function usersClear() {
	var users = $('#users');

	while (users.firstChild) {
		users.removeChild(users.firstChild);
	}

	onlineUsers.length = 0;
}

function userInvite(nick) {
	send({cmd: 'invite', nick: nick});
}

function userModAction(nick) {
	if (modCmd === null){	//如果未设置
		return pushMessage({
			nick: '!',
			text: '您尚未设置管理员操作'
		})
	}

	let toSend = modCmd
	toSend.nick = nick

	send(toSend);
}

function userIgnore(nick) {
	ignoredUsers.push(nick);
}

/* 配色方案切换 */

var schemes = [
	'electron',
	'eighties',
	'default',
	'tomorrow',
	'lax',
	'hacker',
];

var highlights = [
	'darcula',
	'rainbow',
	'zenburn',
	'androidstudio',
]

var uwuPrefixs = [
	'none',
	'onlytext',
	'onlyemoji',
]

var modAction = [	//管理员操作
	{
		text: '无',
		data: null,
	},
	{
		text: '踢出',	//对用户显示的文本
		data: {	//用户选择了这个操作，客户端向服务器发送数据时使用的模板，客户端会自动加上nick参数
			cmd: 'kick',
		},
	},
	{
		text: '封禁',
		data: {
			cmd: 'ban',
		},
	},
	{
		text: '禁言1分钟',
		data: {
			cmd: 'dumb',
			time: 1,
		},
	},
	{
		text: '禁言5分钟',
		data: {
			cmd: 'dumb',
			time: 5,
		}
	},
	{
		text: '禁言10分钟',
		data: {
			cmd: 'dumb',
			time: 10,
		}
	},
	{
		text: '永久禁言',
		data: {
			cmd: 'dumb',
			time: 0,
		}
	},
];

// 默认方案
var currentScheme = 'electron';
var currentHighlight = 'darcula';
var currentPrefix = 'none';

function setScheme(scheme) {
	currentScheme = scheme;
	$('#scheme-link').href = `schemes/${scheme}.css`;
	localStorageSet('scheme', scheme);
}

function setHighlight(scheme) {
	currentHighlight = scheme;
	$('#highlight-link').href = `vendor/hljs/styles/${scheme}.min.css`;
	localStorageSet('highlight', scheme);
}

function setPrefix(scheme) {
	currentPrefix = scheme;
	localStorageSet('prefix', scheme);
	display('none')

	if (scheme && scheme != 'none') {
		display(scheme, 'inline')
	}
}

function addTopic(text) {
	var option = document.createElement('option')
	option.textContent = text
	option.value = encodeURI(text)

	$('#topic-selector').appendChild(option)
}

// 添加主题到下拉条
schemes.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	$('#scheme-selector').appendChild(option);
});

highlights.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	$('#highlight-selector').appendChild(option);
});

uwuPrefixs.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	$('#prefix-selector').appendChild(option);
});

modAction.forEach((action) => {
	var option = document.createElement('option');
	option.textContent = action.text;
	option.value = JSON.stringify(action.data);	//转换为JSON
	$('#mod-action').appendChild(option)
})

$('#scheme-selector').onchange = function (e) {
	setScheme(e.target.value);
}

$('#highlight-selector').onchange = function (e) {
	setHighlight(e.target.value);
}

$('#prefix-selector').onchange = function (e) {
	setPrefix(e.target.value);
}

$('#mod-action').onchange = (e) => {
	modCmd = JSON.parse(e.target.value)	//解析为obj
}

// 从本地存储加载侧边栏配置（如果可用）
if (localStorageGet('scheme')) {
	setScheme(localStorageGet('scheme'));
}

if (localStorageGet('highlight')) {
	setHighlight(localStorageGet('highlight'));
}

if (localStorageGet('prefix')) {
	setPrefix(localStorageGet('prefix'));
}

$('#scheme-selector').value = currentScheme;
$('#highlight-selector').value = currentHighlight;
$('#prefix-selector').value = currentPrefix;

/* 首先执行 */

checkClientBanned()
if (!myChannel) {
	$('#messages').innerHTML = '';
	$('#footer').classList.add('hidden');
	$('#sidebar').classList.add('hidden');
	buildHome()
} else {
	join(myChannel);
}
