<script setup>
import { onMounted, ref } from 'vue'

// Lista dummy usada como fallback si el backend no esta disponible
const habits = ref([])
const loading = ref(true)
const error = ref(null)

const API_URL = 'http://127.0.0.1:8000/api/v1/habits/'

async function fetchHabits() {
  try {
    const response = await fetch(API_URL)
    if (!response.ok) throw new Error('Respuesta no valida del backend')
    habits.value = await response.json()
  } catch (err) {
    // Si el backend no esta corriendo, se muestran datos de ejemplo
    error.value = 'No se pudo conectar al backend, mostrando datos de ejemplo'
    habits.value = [
      { id: 1, name: 'Leer 20 minutos', streak_days: 3 },
      { id: 2, name: 'Ejercicio', streak_days: 1 },
    ]
  } finally {
    loading.value = false
  }
}

onMounted(fetchHabits)
</script>

<template>
  <section class="habit-list">
    <h2>Habitos</h2>
    <p v-if="loading">Cargando...</p>
    <p v-else-if="error" class="warning">{{ error }}</p>
    <ul v-if="!loading">
      <li v-for="habit in habits" :key="habit.id">
        {{ habit.name }} — racha: {{ habit.streak_days }} dias
      </li>
    </ul>
  </section>
</template>

<style scoped>
.habit-list {
  max-width: 480px;
  margin: 2rem auto;
  text-align: left;
}
.warning {
  color: #b45309;
}
</style>
