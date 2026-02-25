import { isPrivateIP } from '../../src/validators/url';

describe('URL Validator - isPrivateIP', () => {
  describe('IPv4 private ranges', () => {
    it('should detect 10.x.x.x as private', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.255')).toBe(true);
    });

    it('should detect 172.16-31.x.x as private', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
    });

    it('should not detect 172.15.x.x or 172.32.x.x as private', () => {
      expect(isPrivateIP('172.15.0.1')).toBe(false);
      expect(isPrivateIP('172.32.0.1')).toBe(false);
    });

    it('should detect 192.168.x.x as private', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.100')).toBe(true);
    });

    it('should detect 127.x.x.x (loopback) as private', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.255.255.255')).toBe(true);
    });

    it('should detect 0.x.x.x as private', () => {
      expect(isPrivateIP('0.0.0.0')).toBe(true);
    });

    it('should detect 169.254.x.x (link-local) as private', () => {
      expect(isPrivateIP('169.254.0.1')).toBe(true);
      expect(isPrivateIP('169.254.169.254')).toBe(true);
    });

    it('should detect 100.64-127.x.x (CGNAT) as private', () => {
      expect(isPrivateIP('100.64.0.1')).toBe(true);
      expect(isPrivateIP('100.127.255.255')).toBe(true);
    });
  });

  describe('IPv6 private ranges', () => {
    it('should detect ::1 (loopback) as private', () => {
      expect(isPrivateIP('::1')).toBe(true);
    });

    it('should detect fe80: (link-local) as private', () => {
      expect(isPrivateIP('fe80::1')).toBe(true);
    });

    it('should detect fc/fd (unique local) as private', () => {
      expect(isPrivateIP('fc00::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
    });
  });

  describe('Public IPs', () => {
    it('should not flag public IPv4 addresses', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('203.0.113.1')).toBe(false);
    });
  });
});
