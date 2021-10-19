<template>
  <div class="home">
    <button class="btn" @click="createClient">加入</button>
    <button class="btn" @click="callRemote">离开</button>
    <div class="bodyMain">
      <!-- 本地视频容器 -->
      <div id='local_video' class="play"></div>
      <!-- 远端视频容器 -->
      <div id='remote_video' class="play"></div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'Home',
  data() {
    return {
      // 房主id：1234、
      // 路人id：4321、
      // 房间号：aaaa、
      localInvitation: null, // 通过 ArRTMClient.createLocalInvitation 创建的实例
      ArRTMClient: null,     // 通过 this.$ArRTM.createInstance 创建的RTM客户端实例
      ArRTCClient: null,     // 通过 this.$ArRTC.createClient 创建的客户端对象
      audioTrack: null,      // 本地音频轨道
      videoTrack: null,      // 本地视频轨道
      audioDevices: [],      // 本地音频设备列表
      videoDevices: [],       // 本地视频设备列表
      remoteUid: '',          // 远端用户的 uid
      config: {
        appid: 'b3228eb970c80d289454d3453c28c43d',
        channel: '1111',  // 频道
        uid: 'web' + Math.floor(Math.random() * 10000000) // 随机生成本地uid
      }
    }
  },
  created() {
    console.log('ArRTM:', this.$ArRTM)
    console.log('ArRTC:', this.$ArRTC)
    // this.getRemoteUid(); // 获取远程用户 uid
    this.getDevices();   // 获取音视频设备
    this.createTrack();  // 创建本地音视频轨道
  },
  methods: {
    // 获取远端用户 uid (这一步可以用输入框代替)
    getRemoteUid() {
      const remoteUid = this.$route.query.uid;
      if (remoteUid) {
        this.remoteUid = remoteUid;
        this.createClient();
      }
    },

// 获取音视频设备
    async getDevices() {
      const [videoDevices, audioDevices] = await Promise.all([
        this.$ArRTC.getCameras(),
        this.$ArRTC.getMicrophones(),
      ]);
      this.videoDevices = videoDevices;
      this.audioDevices = audioDevices;
    },

// 创建本地音视频轨道
    async createTrack() {
      this.audioTrack = await this.$ArRTC.createMicrophoneAudioTrack();
      // 如果没有摄像头设备就不创建视频轨道
      if (this.videoDevices.length) {
        this.videoTrack = await this.$ArRTC.createCameraVideoTrack();
      }
    },

// 创建 RTM 和 RTC 客户端对象
    createClient() {
      this.ArRTMClient = this.$ArRTM.createInstance(this.config.appid);
      this.ArRTCClient = this.$ArRTC.createClient({mode: 'rtc', codec: 'h264'});
      // 监听远端用户发布音视频流
      this.listenUserPublished();
      // 监听点对点消息
      this.listenMessageFromPeer();
      // 登录 RTM
      this.ArRTMClient.login({uid: this.config.uid}).then(() => {
        // 监听远端用户上下线
        this.listenPeersOnlineStatusChanged();
        // 订阅人员上下线
        this.subscribePeersOnlineStatus();
      }).catch((err) => {
        console.log(err);
      });
    },

// 监听点对点消息 (这里主要的作用就是远端通过rtm消息，告诉我们他的一些状态)
    listenMessageFromPeer() {
      this.ArRTMClient.on('MessageFromPeer', message => {
        // 状态码自己约定
        if (message.text === '100') {
          // 对方正在通话中
        } else if (message.text === '200') {
          // 对方挂断 我们也要离开房间
          this.handleLeave();
        }
      });
    },

// 监听远端用户发布音视频流
    listenUserPublished() {
      this.ArRTCClient.on("user-published", async (user, mediaType) => {
        await this.ArRTCClient.subscribe(user, mediaType);
        if (mediaType === 'video') {
          // 播放远端视频 (传入一个dom元素id)
          user.videoTrack.play('#remote_video');
        } else if (mediaType === 'audio') {
          // 播放远端音频 (音频不需要元素)
          user.audioTrack.play();
        }
      });
    },

// 监听远端用户上下线
    listenPeersOnlineStatusChanged() {
      this.ArRTMClient.on('PeersOnlineStatusChanged', (status) => {
        const ONLINE = status[this.remoteUid] === 'ONLINE';
        // 如果对方在线 就发送呼叫邀请
        ONLINE && this.callRemote(this.remoteUid);
      });
    },

// 监听 localInvitation 状态
    localInvitationListen() {
      // 被叫已接受呼叫邀请时触发
      this.localInvitation.on('LocalInvitationAccepted', (response) => {
        // 对方同意接听 本地加入频道
        this.joinChannel();
        console.log(response, '被叫已接受呼叫邀请时触发')
      });
    },

// 加入频道
    joinChannel() {
      this.ArRTCClient.join(this.config.appid, this.config.uid, null, this.config.uid).then(() => {
        this.videoTrack && this.videoTrack.play('local_video');
        // 发布本地音视频
        this.audioTrack && this.ArRTCClient.publish(this.audioTrack);
        this.videoTrack && this.ArRTCClient.publish(this.videoTrack);
      }).catch((err) => {
        console.log(err);
      });
    },

// 订阅人员上下线
    subscribePeersOnlineStatus() {
      this.ArRTMClient.subscribePeersOnlineStatus([this.remoteUid]);
    },

// 呼叫远端用户
    callRemote() {
      // 创建一个 LocalInvitation 实例
      this.localInvitation = this.ArRTMClient.createLocalInvitation(this.remoteUid);
      // 监听 localInvitation 状态
      this.localInvitationListen();
      // 发起呼叫
      this.localInvitation.send();
    },

// 挂断
    handleLeave() {
      // 离开频道
      this.ArRTCClient.leave();
      // 取消已发送的呼叫邀请
      this.localInvitation.cancel();
    },

  }
}
</script>
<style lang="scss" scoped>
.btn {
  width: 60px;
  line-height: 1;
  outline: none;
  height: 30px;
}

.btn + .btn {
  margin-left: 20px;
}

.bodyMain {
  width: 1444px;
  margin: 20px auto 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .play {
    width: 45%;
    height: 400px;
    border: 1px solid;
  }
}
</style>
