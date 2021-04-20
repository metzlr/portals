export default class Utils {
  static sgn(x) {
    if (x > 0.0) return 1.0;
    if (x < 0.0) return -1.0;
    return 0.0;
  }
}
