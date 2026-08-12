import { describe, expect, it } from "vitest";
import { calculateDistanceKm, isPointInPolygon } from "@/server/coverage/zones";
import { parseCoordinatesOrLink } from "@/server/coverage/naps";

describe("Calculador Haversine de Cobertura GPS", () => {
  it("calcula correctamente la distancia entre dos puntos conocidos", () => {
    const dist = calculateDistanceKm(-12.046374, -77.042793, -12.1211, -77.0297);
    expect(dist).toBeGreaterThan(7.5);
    expect(dist).toBeLessThan(9.5);
  });

  it("retorna 0 km para las mismas coordenadas", () => {
    const dist = calculateDistanceKm(19.432608, -99.133209, 19.432608, -99.133209);
    expect(dist).toBe(0);
  });
});

describe("Ray-Casting: punto dentro de polígono", () => {
  const triangulo = [
    { lat: 0, lng: 0 },
    { lat: 10, lng: 0 },
    { lat: 5, lng: 10 },
  ];

  it("detecta un punto dentro del triángulo", () => {
    expect(isPointInPolygon(5, 3, triangulo)).toBe(true);
  });

  it("detecta un punto fuera del triángulo", () => {
    expect(isPointInPolygon(0, 10, triangulo)).toBe(false);
  });

  it("retorna false para polígono con menos de 3 puntos", () => {
    expect(isPointInPolygon(5, 3, [{ lat: 0, lng: 0 }])).toBe(false);
    expect(isPointInPolygon(5, 3, [])).toBe(false);
  });
});

describe("parseCoordinatesOrLink (Cobertura NAP)", () => {
  it("parsea el formato de ubicación compartida en WhatsApp", () => {
    const res = parseCoordinatesOrLink("📍 Ubicación compartida: Latitud -16.515099, Longitud -68.274197");
    expect(res).toEqual({ lat: -16.515099, lng: -68.274197 });
  });

  it("parsea enlaces de Google Maps con @lat,lng", () => {
    const res = parseCoordinatesOrLink("https://www.google.com/maps/@-16.4792688,-68.2741975,17z");
    expect(res).toEqual({ lat: -16.4792688, lng: -68.2741975 });
  });

  it("parsea coordenadas brutas", () => {
    const res = parseCoordinatesOrLink("-16.4792688, -68.2741975");
    expect(res).toEqual({ lat: -16.4792688, lng: -68.2741975 });
  });
});

