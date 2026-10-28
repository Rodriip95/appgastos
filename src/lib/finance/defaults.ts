import type { Category } from "@/lib/finance/types";

type DefaultCategory = Omit<Category, "id" | "subcategories"> & { subcategories: string[] };

// Categorías sugeridas que el usuario puede importar con un toque.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Gastos
  { type: "expense", name: "Hogar", icon: "house", color: "orange", description: "Vivienda y mantenimiento de la casa", subcategories: ["Alquiler", "Expensas", "Mantenimiento", "Muebles y deco"] },
  { type: "expense", name: "Servicios", icon: "zap", color: "amber", description: "Cuentas fijas de todos los meses", subcategories: ["Luz", "Agua", "Gas", "Internet", "Celular"] },
  { type: "expense", name: "Mercado", icon: "shopping-cart", color: "emerald", description: "Compras de comida y artículos del hogar", subcategories: ["Supermercado", "Verdulería", "Carnicería", "Almacén"] },
  { type: "expense", name: "Transporte", icon: "bus", color: "sky", description: "Moverse por la ciudad", subcategories: ["Colectivo / Subte", "Taxi / Uber", "Tren"] },
  { type: "expense", name: "Carro", icon: "car", color: "blue", description: "Gastos del vehículo", subcategories: ["Seguro", "Combustible", "Mantenimiento", "Patente", "Peajes", "Estacionamiento"] },
  { type: "expense", name: "Salud", icon: "heart-pulse", color: "red", description: "Cobertura médica y cuidados", subcategories: ["Prepaga / Obra social", "Farmacia", "Consultas", "Gimnasio"] },
  { type: "expense", name: "Educación", icon: "graduation-cap", color: "indigo", description: "Estudios propios o de la familia", subcategories: ["Cuotas", "Cursos", "Libros y útiles"] },
  { type: "expense", name: "Comida afuera", icon: "utensils", color: "pink", description: "Restaurantes, delivery y cafés", subcategories: ["Restaurantes", "Delivery", "Café"] },
  { type: "expense", name: "Entretenimiento", icon: "popcorn", color: "violet", description: "Ocio y suscripciones", subcategories: ["Streaming", "Salidas", "Hobbies", "Viajes"] },
  { type: "expense", name: "Ropa y cuidado", icon: "shirt", color: "teal", description: "Ropa, calzado y cuidado personal", subcategories: ["Ropa", "Calzado", "Peluquería"] },
  { type: "expense", name: "Mascotas", icon: "paw-print", color: "lime", description: "", subcategories: ["Alimento", "Veterinaria"] },
  { type: "expense", name: "Tarjetas y deudas", icon: "credit-card", color: "slate", description: "Pagos de tarjetas, préstamos y comisiones", subcategories: ["Tarjeta de crédito", "Préstamos", "Comisiones bancarias"] },
  { type: "expense", name: "Otros gastos", icon: "tag", color: "slate", description: "", subcategories: [] },
  // Ingresos
  { type: "income", name: "Sueldo", icon: "briefcase", color: "emerald", description: "Ingresos por trabajo en relación de dependencia", subcategories: ["Sueldo", "Aguinaldo", "Bonos"] },
  { type: "income", name: "Freelance", icon: "laptop", color: "sky", description: "Trabajos independientes", subcategories: [] },
  { type: "income", name: "Inversiones", icon: "trending-up", color: "violet", description: "Rendimientos de ahorros e inversiones", subcategories: ["Plazo fijo", "Dividendos", "Cripto"] },
  { type: "income", name: "Ventas", icon: "store", color: "amber", description: "", subcategories: [] },
  { type: "income", name: "Regalos", icon: "gift", color: "pink", description: "", subcategories: [] },
  { type: "income", name: "Otros ingresos", icon: "wallet", color: "slate", description: "", subcategories: [] },
];
