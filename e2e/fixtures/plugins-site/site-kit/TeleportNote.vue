<script setup lang="ts">
// Reaches into `<body>` through a teleport and changes after hydration, so a
// teleport the server left out shows up as an error on the first update.
defineOptions({ data: () => ({ count: 0 }) })
</script>

<template>
  <button type="button" class="teleport-note-trigger" @click="count++">
    Bump {{ count }}
  </button>
  <Teleport to="body">
    <p class="teleport-note">
      Teleported {{ count }}
    </p>
  </Teleport>
</template>
