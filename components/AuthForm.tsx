import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Eye, EyeOff, LockIcon } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";
import { icons } from "../constants/icons";
import { images } from "../constants/images";
import {
  EmailVerificationRequiredError,
  getAuthErrorMessage,
} from "../services/authErrors";
import {
  forgotPasswordAuth,
  resendVerificationEmail,
  signInWithEmailAndPasswordAuth,
  signUpWithEmailAndPasswordAuth,
} from "../services/EmailandPasswordAuth";

type FormType = "SignIn" | "SignUp" | "ForgotPassword";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must contain at least 8 characters")
    .optional(),
  confirmPassword: z
    .string()
    .min(1, "Confirm Password is required")
    .min(8, "Password must contain at least 8 characters")
    .optional(),
});

export type SignInValues = z.infer<typeof signInSchema>;
const forgotPasswordSchema = signInSchema.pick({ email: true });
const AuthForm = ({ type }: { type: FormType }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationUid, setVerificationUid] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(
      type === "ForgotPassword" ? forgotPasswordSchema : signInSchema,
    ),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: type === "SignUp" ? "" : undefined,
    },
  });

  const emailValue = watch("email");
  const passwordValue = watch("password") || "";
  const confirmPasswordValue = watch("confirmPassword") || "";

  const canSubmit =
    type === "SignIn"
      ? emailValue.trim().length > 0 && passwordValue.trim().length > 0
      : type === "SignUp"
        ? emailValue.trim().length > 0 &&
          passwordValue.trim().length > 0 &&
          confirmPasswordValue.trim().length > 0
        : emailValue.trim().length > 0;

  const onSubmit = async (values: SignInValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setVerificationUid(null);
    const { email, password, confirmPassword } = values;

    if (type === "ForgotPassword") {
      try {
        await forgotPasswordAuth(email);
        setSuccessMessage(
          "If an account exists for this email, you'll receive a password reset link. Please check your inbox and spam folder, then sign in with your new password.",
        );
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error, type));
      }
      return;
    }

    if (type === "SignUp" && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (type === "SignIn") {
      try {
        await signInWithEmailAndPasswordAuth(email, password);
        router.replace("/");
      } catch (error) {
        if (error instanceof EmailVerificationRequiredError) {
          setVerificationUid(error.uid);
        }
        setErrorMessage(getAuthErrorMessage(error, type));
      }
    }

    if (type === "SignUp") {
      try {
        const signUp = await signUpWithEmailAndPasswordAuth(email, password);

        setSuccessMessage(
          `Verification email sent to ${signUp.email}. Please check your inbox and verify your email before signing in.`,
        );
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error, type));
      }
    }
  };

  const onResendVerification = async () => {
    if (!verificationUid || isResending || isSubmitting) return;
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await resendVerificationEmail(verificationUid);
      setSuccessMessage(
        `Verification email sent to ${result.email}. Please check your inbox, verify your email, then sign in.`,
      );
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "Resend"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="flex-1 absolute w-full z-0"
        resizeMode="cover"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-5"
        contentContainerStyle={{
          minHeight: "100%",
          paddingBottom: 10,
          gap: 100,
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        <View className="flex items-center mt-20 self-center gap-y-10 w-full">
          <Text className="text-accent text-2xl">
            {type === "SignIn"
              ? "Sign In"
              : type === "SignUp"
                ? "Sign Up"
                : "Forgot Password"}
          </Text>
          <View>
            {type === "SignIn" || type === "SignUp" ? (
              <View
                className="flex-row flex-wrap
               gap-x-2 items-center justify-center"
              >
                <Text className=" text-white text-center text-2xl">
                  Email and password
                </Text>
              </View>
            ) : (
              <View className="flex-row gap-x-2 items-center justify-center">
                <Text className="text-white text-center text-xl">
                  Enter your email to reset your password
                </Text>
              </View>
            )}
          </View>
          <View className="w-full">
            <View className="flex-row items-center gap-x-3 w-full border border-gray-500 rounded-lg p-3 py-5">
              <LockIcon color="gray" size={24} />

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 text-white"
                  />
                )}
              />
            </View>
          </View>
          {errors.email && (
            <Text className="text-red-500">{errors.email.message}</Text>
          )}
          <>
            {type === "SignIn" || type === "SignUp" ? (
              <View className="flex-row items-center gap-x-3 w-full border border-gray-500 rounded-lg p-3 py-5">
                <LockIcon color="gray" size={24} />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Password"
                      secureTextEntry={!isPasswordVisible}
                      className="flex-1 text-white"
                    />
                  )}
                />
                <Pressable
                  onPress={() => setIsPasswordVisible((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  hitSlop={10}
                >
                  {isPasswordVisible ? (
                    <EyeOff color="gray" size={24} />
                  ) : (
                    <Eye color="gray" size={24} />
                  )}
                </Pressable>
              </View>
            ) : null}
            {errors.password && (
              <Text className="text-red-500">{errors.password.message}</Text>
            )}
          </>
          {type === "SignUp" && (
            <>
              <View className="flex-row items-center gap-x-3 w-full border border-gray-500 rounded-lg p-3 py-5">
                <LockIcon color="gray" size={24} />

                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Confirm Password"
                      secureTextEntry={!isConfirmPasswordVisible}
                      className="flex-1 text-white"
                    />
                  )}
                />
                <Pressable
                  onPress={() =>
                    setIsConfirmPasswordVisible((visible) => !visible)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    isConfirmPasswordVisible
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  hitSlop={10}
                >
                  {isConfirmPasswordVisible ? (
                    <EyeOff color="gray" size={24} />
                  ) : (
                    <Eye color="gray" size={24} />
                  )}
                </Pressable>
              </View>
              {errors.confirmPassword && (
                <Text className="text-red-500">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </>
          )}

          {errorMessage && (
            <Text accessibilityRole="alert" className="text-red-500">
              {errorMessage}
            </Text>
          )}
          {successMessage && (
            <Text className="text-green-500">{successMessage}</Text>
          )}
          {type === "SignIn" && verificationUid && (
            <Pressable
              accessibilityRole="button"
              disabled={isResending || isSubmitting || !canSubmit}
              onPress={onResendVerification}
            >
              <Text className="text-accent font-bold">
                {isResending
                  ? "Sending verification email..."
                  : "Resend verification email"}
              </Text>
            </Pressable>
          )}

          <TouchableOpacity
            disabled={isSubmitting || isResending || !canSubmit}
            onPress={handleSubmit(onSubmit)}
            className="bg-accent rounded-lg w-full py-5 flex items-center justify-center"
            style={{
              opacity: isSubmitting || isResending || !canSubmit ? 0.5 : 1,
            }}
          >
            <Text className="text-dark-200 text-xl font-bold">
              {type === "ForgotPassword" ? (
                isSubmitting ? (
                  "Sending reset link..."
                ) : (
                  "Send reset link"
                )
              ) : type === "SignIn" ? (
                isSubmitting ? (
                  <View className="flex-row items-center gap-x-2">
                    <ActivityIndicator size="small" color="#0000ff" />
                    <Text className="text-dark-200 text-xl">Signing in...</Text>
                  </View>
                ) : (
                  "Sign In"
                )
              ) : isSubmitting ? (
                <View className="flex-row items-center gap-x-2">
                  <ActivityIndicator size="small" color="#0000ff" />
                  <Text className="text-dark-200 text-xl">Signing up...</Text>
                </View>
              ) : (
                "Sign Up"
              )}
            </Text>
          </TouchableOpacity>
          {type === "SignIn" && (
            <Pressable onPress={() => router.navigate("/auth/forgotPassword")}>
              <Text className="text-accent text-lg font-bold">
                Forgot Password?
              </Text>
            </Pressable>
          )}
          <View className="flex-row items-center gap-x-2 self-center mt-1">
            <Text className="text-white text-center">
              {type === "SignIn"
                ? "Don't have an account? "
                : type === "SignUp"
                  ? "Already have an account? "
                  : "remember your password? "}
            </Text>
            <Pressable
              onPress={() =>
                router.navigate(
                  type === "SignIn" ? "/auth/signUp" : "/auth/signIn",
                )
              }
            >
              <Text className="text-accent font-bold">
                {type === "SignIn" ? "Sign Up" : "Sign In"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity
        className="absolute bottom-5 left-0 right-0 mx-5 bg-accent rounded-lg py-3.5 flex flex-row items-center justify-center z-50"
        onPress={() => router.push("/profile")}
      >
        <Image
          source={icons.arrow}
          className="size-5 mr-1 mt-0.5 rotate-180"
          tintColor="#fff"
        />
        <Text className="text-white font-semibold text-base">Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AuthForm;
