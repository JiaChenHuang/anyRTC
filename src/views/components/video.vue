<template>
  <div :id="'play-' + uid">

  </div>
</template>

<script>
export default {
  name: "video",
  props: {
    uid: {
      type: [String, Number],
      default: 'abc'
    },
  }
}
</script>

<style scoped>

</style>
