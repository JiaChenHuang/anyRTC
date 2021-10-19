<template>
  <div class="home">
    <button class="btn" @click="join">加入</button>
    <button class="btn" @click="join">离开</button>
    <div class="bodyMain">
      <!-- 本地视频容器 -->
      <div id='local_video' class="play"></div>
      <!-- 远端视频容器 -->
      <myVideo :uid="uid" class="play"/>
    </div>
  </div>
</template>

<script>
import video from './components/video'

export default {
  components: {
    myVideo: video
  },
  name: 'Home',
  data() {
    return {

      client: null,     // 通过 this.$ArRTC.createClient 创建的客户端对象
      localTracks: {
        videoTrack: null,
        audioTrack: null
      },
      remoteUsers: {},
      config: {
        appid: 'b3228eb970c80d289454d3453c28c43d',
        channel: '1111',  // 频道
        token: null,
        uid: 'web' + Math.floor(Math.random() * 10000000) // 随机生成本地uid
      },
      uid: null,
    }
  },

  created() {

    this.getRemoteUid(); // 获取远程用户 uid
    // this.getDevices();   // 获取音视频设备
    // this.createTrack();  // 创建本地音视频轨道
  },
  methods: {
    getRemoteUid() {
      const uid = this.$route.query.uid
      if (uid) {
        this.join()
      }
    },
    async join() {
      this.client = this.$ArRTC.createClient({mode: "rtc", codec: "h264"});
      this.client.on("user-published", (user, mediaType) => this.handleUserPublished(user, mediaType));
      this.client.on("user-unpublished", (user) => this.handleUserUnpublished(user));
      [this.config.uid, [this.localTracks.audioTrack, this.localTracks.videoTrack]] = await Promise.all([
        this.client.join(this.config.appid, this.config.channel, this.config.token || null, this.config.uid),
        this.$ArRTC.createMicrophoneAndCameraTracks({}, {
          encoderConfig: {
            bitrateMax: 2048,
            bitrateMin: 1024,
            frameRate: 15,
            width: 320,
            height: 240,
          }
        }),
      ]);
      this.localTracks.videoTrack.play("local_video");
      const url = 'http://localhost:8080/about?uid=1234'
      console.log('本地的用户id：', this.config.uid)
      console.log('url:', url)
      await this.client.publish(Object.values(this.localTracks));
    },
    async subscribe(user, mediaType) {
      const uid = user.uid;
      this.uid = uid
      await this.client.subscribe(user, mediaType);
      console.log("subscribe success");
      if (mediaType === 'video') {
        user.videoTrack.play(`play-${uid}`);
      }
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    },
    handleUserPublished(user, mediaType) {
      const id = user.uid;
      this.remoteUsers[id] = user;
      this.subscribe(user, mediaType);
    },
    handleUserUnpublished(user) {
      const id = user.uid;
      delete this.remoteUsers[id];
    }
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
